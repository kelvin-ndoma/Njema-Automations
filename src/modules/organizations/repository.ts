import 'server-only';
import { Types } from 'mongoose';
import type { z } from 'zod';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { Organization, Membership, AuditEvent } from './models';
import {
  AccessDenied,
  authorizeMembership,
  type businessSettingsInput,
  type organizationInput,
} from './policy';
export async function findOrganization(slug: string) {
  await connectDb();
  return Organization.findOne({ slug }).exec();
}
export async function findMembership(organizationId: Types.ObjectId, userId: string) {
  await connectDb();
  return Membership.findOne({ organizationId, userId }).exec();
}
export async function findUserOrganizations(userId: string) {
  await connectDb();
  const memberships = await Membership.find({ userId, status: 'active' }).exec();
  const organizations = await Organization.find({
    _id: { $in: memberships.map((m) => m.organizationId) },
  })
    .sort({ name: 1 })
    .exec();
  return { memberships, organizations };
}
export async function insertOrganization(userId: string, input: z.infer<typeof organizationInput>) {
  await connectDb();
  const session = await Organization.db.startSession();
  try {
    await session.withTransaction(async () => {
      const id = new Types.ObjectId();
      await Organization.create([{ _id: id, ...input }], { session });
      await Membership.create([{ organizationId: id, userId, role: 'owner', status: 'active' }], {
        session,
      });
      await AuditEvent.create(
        [
          {
            organizationId: id,
            actorId: userId,
            action: 'organization.created',
            resourceId: String(id),
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
export async function insertSwitchAudit(userId: string, organizationId: string) {
  await connectDb();
  await AuditEvent.create({
    organizationId,
    actorId: userId,
    action: 'organization.switched',
    resourceId: organizationId,
  });
}

export async function updateBusinessSettings(
  organizationId: string,
  userId: string,
  input: z.infer<typeof businessSettingsInput>,
) {
  await connectDb();
  await Organization.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    const membership = await Membership.findOne({ organizationId, userId }).session(session).exec();
    authorizeMembership(membership, userId, 'organization:update');
    const result = await Organization.updateOne(
      { _id: organizationId },
      { $set: input },
      { session },
    );
    if (result.matchedCount !== 1) throw new AccessDenied();
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'organization.settings.updated',
          resourceId: organizationId,
        },
      ],
      { session },
    );
  });
}

// Internal provisioning boundary: the caller obtains actorId from a database
// session. Organization permissions remain required; platform grants do not bypass them.
export async function grantOrganizationAdmin(
  organizationId: string,
  actorId: string,
  userId: string,
) {
  await connectDb();
  return Membership.db.transaction(async (session) => {
    await assertTenantState(organizationId, actorId, 'members:manage', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId: actorId }).session(session).exec(),
      actorId,
      'members:manage',
    );
    if (!(await Organization.exists({ _id: organizationId }).session(session)))
      throw new AccessDenied();
    const userIds = Types.ObjectId.isValid(userId)
      ? [new Types.ObjectId(userId), userId]
      : [userId];
    const user = await Membership.db
      .db!.collection<{ _id: string | Types.ObjectId }>('user')
      .findOne({ _id: { $in: userIds } }, { session, projection: { _id: 1 } });
    if (!user) throw new AccessDenied();
    const previous = await Membership.findOne({ organizationId, userId }).session(session).exec();
    if (previous?.role === 'owner')
      throw new Error('Existing owner membership must not be changed by admin provisioning.');
    if (previous?.role === 'admin' && previous.status === 'active') return { changed: false };
    const member = await Membership.findOneAndUpdate(
      { organizationId, userId },
      { $set: { role: 'admin', status: 'active' } },
      { upsert: true, session, returnDocument: 'after', runValidators: true },
    ).exec();
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId,
          action: 'organization.admin.assigned',
          resourceId: String(member!._id),
        },
      ],
      { session },
    );
    return { changed: true };
  });
}
