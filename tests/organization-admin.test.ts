import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { Organization, Membership, AuditEvent } from '@/modules/organizations/models';
import { grantOrganizationAdmin } from '@/modules/organizations/repository';
let replica: MongoMemoryReplSet | undefined;
let organizationId: string;
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'admin-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'admin-test-only-secret-over-32-characters';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
  ]);
  const org = await Organization.create({
    name: 'Synthetic Business',
    slug: 'synthetic-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  organizationId = String(org._id);
  await Membership.create({ organizationId, userId: 'owner', role: 'owner', status: 'active' });
  await mongoose.connection
    .db!.collection<{ _id: string }>('user')
    .insertMany([{ _id: 'target' }, { _id: 'rollback-target' }, { _id: 'owner' }]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});
it('denies missing, foreign and revoked memberships before granting privileges', async () => {
  await expect(grantOrganizationAdmin(organizationId, 'outsider', 'target')).rejects.toThrow(
    'access denied',
  );
  await Membership.create({ organizationId, userId: 'revoked', role: 'owner', status: 'revoked' });
  await expect(grantOrganizationAdmin(organizationId, 'revoked', 'target')).rejects.toThrow(
    'access denied',
  );
  expect(await Membership.countDocuments({ organizationId, userId: 'target' })).toBe(0);
});
it('requires an existing target identity and preserves owners', async () => {
  await expect(grantOrganizationAdmin(organizationId, 'owner', 'missing')).rejects.toThrow(
    'access denied',
  );
  await expect(grantOrganizationAdmin(organizationId, 'owner', 'owner')).rejects.toThrow(
    'owner membership',
  );
  expect((await Membership.findOne({ organizationId, userId: 'owner' }))?.role).toBe('owner');
});
it('creates an active organization admin with a transactional audit and no platform grant', async () => {
  expect(await grantOrganizationAdmin(organizationId, 'owner', 'target')).toEqual({
    changed: true,
  });
  expect(await Membership.findOne({ organizationId, userId: 'target' }).lean()).toMatchObject({
    role: 'admin',
    status: 'active',
  });
  expect(
    await AuditEvent.countDocuments({
      organizationId,
      actorId: 'owner',
      action: 'organization.admin.assigned',
    }),
  ).toBe(1);
  expect(await mongoose.connection.db!.collection('platformRoles').countDocuments()).toBe(0);
  expect(await grantOrganizationAdmin(organizationId, 'owner', 'target')).toEqual({
    changed: false,
  });
  expect(
    await AuditEvent.countDocuments({ organizationId, action: 'organization.admin.assigned' }),
  ).toBe(1);
});
it('rolls back membership changes when auditing fails', async () => {
  const spy = vi
    .spyOn(AuditEvent, 'create')
    .mockRejectedValueOnce(new Error('synthetic audit failure'));
  try {
    await expect(
      grantOrganizationAdmin(organizationId, 'owner', 'rollback-target'),
    ).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect(await Membership.countDocuments({ organizationId, userId: 'rollback-target' })).toBe(0);
});
