import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { createWorkspace } from '@/modules/organizations/service';
import {
  Organization,
  Membership,
  AuditEvent,
  MutationLimit,
} from '@/modules/organizations/models';
import { Invitation } from '@/modules/team/models';
import {
  acceptTeamInvitation,
  getTeamPage,
  inviteTeamMember,
  revokeTeamInvitation,
  revokeTeamMember,
} from '@/modules/team/service';

const state = vi.hoisted(() => ({ id: 'team-owner', email: 'owner@team.example' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => ({ id: state.id, email: state.email }),
}));

let replica: MongoMemoryReplSet | undefined;
let inviteToken = '';

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'team-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'team-test-secret-over-32-characters-long';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    Invitation.createIndexes(),
  ]);
  await Membership.db.collection('user').insertMany([
    { _id: 'team-owner' as unknown as import('mongodb').ObjectId, email: 'owner@team.example', name: 'Owner' },
    { _id: 'team-agent' as unknown as import('mongodb').ObjectId, email: 'agent@team.example', name: 'Agent' },
  ]);
  await createWorkspace(state.id, {
    name: 'Team Business',
    slug: 'team-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});

it('creates invitations, accepts with matching email, and protects the last owner', async () => {
  const created = await inviteTeamMember('team-business', {
    email: 'agent@team.example',
    role: 'agent',
  });
  inviteToken = created.token;
  expect(created.delivery).toBe('manual_link');
  const page = await getTeamPage('team-business');
  expect(page.invitations.some((row) => row.email === 'agent@team.example')).toBe(true);

  state.id = 'team-agent';
  state.email = 'agent@team.example';
  const accepted = await acceptTeamInvitation({ token: inviteToken });
  expect(accepted.slug).toBe('team-business');

  state.id = 'team-owner';
  state.email = 'owner@team.example';
  const afterAccept = await getTeamPage('team-business');
  expect(afterAccept.members.some((row) => row.userId === 'team-agent' && row.role === 'agent')).toBe(
    true,
  );

  const agentMembership = afterAccept.members.find((row) => row.userId === 'team-agent')!;
  await revokeTeamMember('team-business', { membershipId: agentMembership.id });
  const ownerMembership = afterAccept.members.find((row) => row.userId === 'team-owner')!;
  await expect(
    revokeTeamMember('team-business', { membershipId: ownerMembership.id }),
  ).rejects.toThrow(/last owner|own access/i);

  const secondInvite = await inviteTeamMember('team-business', {
    email: 'viewer@team.example',
    role: 'viewer',
  });
  await revokeTeamInvitation('team-business', { invitationId: secondInvite.id });
  const finalPage = await getTeamPage('team-business');
  expect(finalPage.invitations.some((row) => row.email === 'viewer@team.example')).toBe(false);
});
