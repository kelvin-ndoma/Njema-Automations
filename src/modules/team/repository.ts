import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { ObjectId, type ClientSession, type Document, type Filter } from 'mongodb';
import { Types } from 'mongoose';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership, Organization } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { AccessDenied, authorizeMembership, type Role } from '@/modules/organizations/policy';
import { Invitation } from './models';
import {
  TeamUnavailable,
  type membershipRoleInput,
  type teamInviteInput,
} from './input';
import type { z } from 'zod';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function userIds(values: string[]) {
  return values.flatMap((value) =>
    ObjectId.isValid(value) ? [new ObjectId(value), value] : [value],
  );
}

async function countActiveOwners(
  organizationId: string | Types.ObjectId,
  session?: ClientSession | null,
) {
  return Membership.countDocuments({
    organizationId,
    role: 'owner',
    status: 'active',
  })
    .session(session ?? null)
    .exec();
}

export async function listTeam(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  await connectDb();
  const db = Membership.db;
  const [members, invitations] = await Promise.all([
    Membership.find({ organizationId }).sort({ createdAt: 1, _id: 1 }).lean().exec(),
    Invitation.find({ organizationId, status: 'pending' })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .lean()
      .exec(),
  ]);
  const memberUserIds = [...new Set(members.map((row) => row.userId))];
  const users = memberUserIds.length
    ? await db
        .collection('user')
        .find({ _id: { $in: userIds(memberUserIds) } } as Filter<Document>, {
          projection: { _id: 1, email: 1, name: 1 },
        })
        .toArray()
    : [];
  const userMap = new Map(users.map((row) => [String(row._id), row]));
  const now = Date.now();
  return {
    members: members.map((row) => {
      const user = userMap.get(row.userId);
      return {
        id: String(row._id),
        userId: row.userId,
        role: row.role as Role,
        status: row.status,
        email: typeof user?.email === 'string' ? user.email : null,
        name: typeof user?.name === 'string' ? user.name : null,
      };
    }),
    invitations: invitations.map((row) => ({
      id: String(row._id),
      email: row.email,
      role: row.role,
      status: row.expiresAt.getTime() < now ? ('expired' as const) : row.status,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function createInvitation(
  organizationId: string,
  userId: string,
  input: z.infer<typeof teamInviteInput>,
) {
  await connectDb();
  return Invitation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'members:manage', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'members:manage',
    );
    const org = await Organization.findById(organizationId).session(session).exec();
    if (!org) throw new AccessDenied();
    const users = await Invitation.db
      .collection('user')
      .find({ email: input.email })
      .project({ _id: 1 })
      .limit(1)
      .toArray();
    if (users[0]?._id) {
      const member = await Membership.findOne({
        organizationId,
        userId: String(users[0]._id),
        status: 'active',
      })
        .session(session)
        .exec();
      if (member) throw new TeamUnavailable('That person is already an active member.');
    }
    await Invitation.updateMany(
      { organizationId, email: input.email, status: 'pending' },
      { $set: { status: 'revoked' } },
      { session },
    );
    const token = randomBytes(32).toString('base64url');
    const [invitation] = await Invitation.create(
      [
        {
          organizationId,
          email: input.email,
          role: input.role,
          status: 'pending',
          tokenHash: hashToken(token),
          invitedBy: userId,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      ],
      { session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'team.invitation.created',
          resourceId: String(invitation._id),
        },
      ],
      { session },
    );
    return {
      id: String(invitation._id),
      token,
      email: input.email,
      role: input.role,
      expiresAt: invitation.expiresAt.toISOString(),
      // Email delivery is not configured; callers must surface the accept path.
      delivery: 'manual_link' as const,
    };
  });
}

export async function revokeInvitation(
  organizationId: string,
  userId: string,
  invitationId: string,
) {
  await connectDb();
  return Invitation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'members:manage', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'members:manage',
    );
    const row = await Invitation.findOneAndUpdate(
      { _id: invitationId, organizationId, status: 'pending' },
      { $set: { status: 'revoked' } },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new TeamUnavailable('Invitation is not pending.');
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'team.invitation.revoked',
          resourceId: invitationId,
        },
      ],
      { session },
    );
    return { id: invitationId };
  });
}

export async function acceptInvitation(userId: string, email: string, token: string) {
  await connectDb();
  const normalizedEmail = email.trim().toLowerCase();
  return Invitation.db.transaction(async (session) => {
    const invitation = await Invitation.findOne({
      tokenHash: hashToken(token),
      status: 'pending',
    })
      .session(session)
      .exec();
    if (!invitation) throw new TeamUnavailable('Invitation is invalid or already used.');
    if (invitation.expiresAt.getTime() < Date.now()) {
      invitation.status = 'expired';
      await invitation.save({ session });
      throw new TeamUnavailable('Invitation has expired.');
    }
    if (invitation.email !== normalizedEmail) {
      throw new TeamUnavailable('Sign in with the invited email address to accept.');
    }
    const org = await Organization.findById(invitation.organizationId).session(session).exec();
    if (!org || org.status !== 'active') throw new TeamUnavailable('Organization is unavailable.');
    const existing = await Membership.findOne({
      organizationId: invitation.organizationId,
      userId,
    })
      .session(session)
      .exec();
    if (existing?.status === 'active') {
      invitation.status = 'accepted';
      invitation.acceptedBy = userId;
      invitation.acceptedAt = new Date();
      await invitation.save({ session });
      return { organizationId: String(org._id), slug: org.slug, alreadyMember: true };
    }
    await Membership.findOneAndUpdate(
      { organizationId: invitation.organizationId, userId },
      {
        $set: {
          role: invitation.role,
          status: 'active',
        },
        $setOnInsert: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
      { upsert: true, session },
    );
    invitation.status = 'accepted';
    invitation.acceptedBy = userId;
    invitation.acceptedAt = new Date();
    await invitation.save({ session });
    await AuditEvent.create(
      [
        {
          organizationId: invitation.organizationId,
          actorId: userId,
          action: 'team.invitation.accepted',
          resourceId: String(invitation._id),
        },
      ],
      { session },
    );
    return { organizationId: String(org._id), slug: org.slug, alreadyMember: false };
  });
}

export async function revokeMembership(
  organizationId: string,
  actorId: string,
  membershipId: string,
) {
  await connectDb();
  return Membership.db.transaction(async (session) => {
    await assertTenantState(organizationId, actorId, 'members:manage', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId: actorId }).session(session).exec(),
      actorId,
      'members:manage',
    );
    const member = await Membership.findOne({ _id: membershipId, organizationId })
      .session(session)
      .exec();
    if (!member || member.status !== 'active') throw new TeamUnavailable('Member not found.');
    if (member.userId === actorId) throw new TeamUnavailable('You cannot revoke your own access.');
    if (member.role === 'owner') {
      const owners = await countActiveOwners(organizationId, session);
      if (owners <= 1) throw new TeamUnavailable('The last owner cannot be removed.');
    }
    member.status = 'revoked';
    await member.save({ session });
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId,
          action: 'team.membership.revoked',
          resourceId: membershipId,
        },
      ],
      { session },
    );
    return { id: membershipId };
  });
}

export async function updateMembershipRole(
  organizationId: string,
  actorId: string,
  input: z.infer<typeof membershipRoleInput>,
) {
  await connectDb();
  return Membership.db.transaction(async (session) => {
    await assertTenantState(organizationId, actorId, 'members:manage', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId: actorId }).session(session).exec(),
      actorId,
      'members:manage',
    );
    const member = await Membership.findOne({ _id: input.membershipId, organizationId })
      .session(session)
      .exec();
    if (!member || member.status !== 'active') throw new TeamUnavailable('Member not found.');
    if (member.role === 'owner') {
      throw new TeamUnavailable('Owner role cannot be changed here.');
    }
    if (member.userId === actorId && input.role !== member.role) {
      // Admins may change their own non-owner role only to a non-privileged role carefully —
      // disallow self role changes to avoid lockouts of members:manage.
      throw new TeamUnavailable('You cannot change your own role.');
    }
    member.role = input.role;
    await member.save({ session });
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId,
          action: 'team.membership.role_updated',
          resourceId: input.membershipId,
        },
      ],
      { session },
    );
    return { id: input.membershipId, role: input.role };
  });
}
