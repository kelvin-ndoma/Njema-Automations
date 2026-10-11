import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { ObjectId } from 'mongodb';
import { authClient } from '@/server/db';
import { seedSuperAdmin, SUPER_ADMIN_EMAIL } from '@/modules/platform/repository';
import { requireSuperAdmin } from '@/modules/platform/service';
import {
  getPlatformAudit,
  getPlatformOverview,
  getPlatformOrganizations,
  getPlatformOrganization,
  getPlatformUsers,
  getPlatformUser,
} from '@/modules/platform/read-repository';
const state = vi.hoisted(() => ({ id: '' }));
vi.mock('@/server/session', () => ({
  requireUser: vi.fn(async () => {
    if (!state.id) throw new Error('SIGN_IN_REQUIRED');
    return { id: state.id };
  }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
let replica: MongoMemoryReplSet;
const adminId = new ObjectId();
const ordinaryId = new ObjectId();
const orgId = new ObjectId();
const operations = () => [
  () => getPlatformAudit({}),
  () => getPlatformOverview({}),
  () => getPlatformOrganizations({}),
  () => getPlatformOrganization(String(orgId), {}),
  () => getPlatformUsers({}),
  () => getPlatformUser(String(adminId), {}),
];
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'platform-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'platform-test-only-secret-over-32-characters';
  const db = authClient().db('platform-test');
  await db.collection('user').insertMany([
    {
      _id: adminId,
      name: 'Admin',
      email: SUPER_ADMIN_EMAIL,
      emailVerified: false,
      createdAt: new Date(),
      password: 'must-not-leak',
      secret: 'must-not-leak',
    },
    { _id: ordinaryId, name: 'Owner', email: 'owner@example.test', createdAt: new Date() },
  ]);
  await db.collection('organizations').insertOne({
    _id: orgId,
    name: 'Existing Organization',
    slug: 'existing-org',
    currency: 'EUR',
    locale: 'en-GB',
    timeZone: 'UTC',
    createdAt: new Date(),
    privateNotes: 'must-not-leak',
  });
  await db.collection('memberships').insertOne({
    organizationId: orgId,
    userId: String(ordinaryId),
    role: 'owner',
    status: 'active',
    createdAt: new Date(),
  });
  await seedSuperAdmin(db, authClient());
});
afterAll(async () => {
  await authClient().close();
  await replica.stop();
});
describe('Milestone 1 authorization boundaries', () => {
  it('requires authentication on every server read', async () => {
    state.id = '';
    for (const operation of operations())
      await expect(operation()).rejects.toThrow('SIGN_IN_REQUIRED');
  });
  it('denies organization owners and admins on every server read', async () => {
    state.id = String(ordinaryId);
    const db = authClient().db('platform-test');
    for (const role of ['owner', 'admin']) {
      await db.collection('memberships').updateOne({ userId: state.id }, { $set: { role } });
      for (const operation of operations()) await expect(operation()).rejects.toThrow('NOT_FOUND');
    }
  });
  it('accepts only the seeded singleton grant', async () => {
    await authClient()
      .db('platform-test')
      .collection('memberships')
      .updateOne({ userId: String(ordinaryId) }, { $set: { role: 'owner' } });
    state.id = String(adminId);
    expect((await requireSuperAdmin()).id).toBe(String(adminId));
  });
});
describe('Milestone 2 real data and projections', () => {
  it('reports real counts, zero-filled UTC growth and absent lifecycle status', async () => {
    state.id = String(adminId);
    const data = await getPlatformOverview({ days: '7' });
    expect(data.totalOrganizations).toBe(1);
    expect(data.totalUsers).toBe(2);
    expect(data.recentOrganizations).toBe(1);
    expect(data.activeOrganizations).toBeNull();
    expect(data.trend).toHaveLength(7);
    expect(data.trend.reduce((n, d) => n + d.count, 0)).toBe(1);
  });
  it('searches literally, clamps pagination, and exposes owners without private fields', async () => {
    const result = await getPlatformOrganizations({ q: 'Existing', page: '999' });
    expect(result.rows).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.rows[0].owners[0].email).toBe('owner@example.test');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect((await getPlatformOrganizations({ q: '.*' })).total).toBe(0);
    expect((await getPlatformOrganizations({ status: 'untracked' })).total).toBe(1);
  });
  it('returns only authorized identity and membership data', async () => {
    const result = await getPlatformUser(String(adminId), {});
    expect(result?.superAdmin).toBe(true);
    expect(result?.user.emailVerified).toBe(false);
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    const users = await getPlatformUsers({ q: 'owner@' });
    expect(users.rows[0].membershipCount).toBe(1);
    const org = await getPlatformOrganization(String(orgId), {});
    expect(org?.memberships.rows[0].role).toBe('owner');
    expect(org?.organization.status).toBeNull();
  });
  it('returns no record for malformed or missing IDs', async () => {
    expect(await getPlatformUser('invalid', {})).toBeNull();
    expect(await getPlatformOrganization(String(new ObjectId()), {})).toBeNull();
  });
  it('uses actual recorded statuses and excludes old records from period metrics', async () => {
    const db = authClient().db('platform-test');
    await db.collection('organizations').insertOne({
      name: 'Archived fixture',
      slug: 'archived-fixture',
      status: 'active',
      createdAt: new Date('2000-01-01'),
    });
    const overview = await getPlatformOverview({ days: '30' });
    expect(overview.totalOrganizations).toBe(2);
    expect(overview.activeOrganizations).toBe(1);
    expect(overview.recentOrganizations).toBe(1);
    expect((await getPlatformOrganizations({ status: 'active' })).total).toBe(1);
  });
  it('denies revoked grants immediately on every read', async () => {
    await authClient()
      .db('platform-test')
      .collection<{ _id: string }>('platformRoles')
      .deleteOne({ _id: 'super-admin' });
    for (const operation of operations()) await expect(operation()).rejects.toThrow('NOT_FOUND');
  });
});

it('returns projected, searchable audit metadata only', async () => {
  state.id = String(adminId);
  // Previous revocation test removes the grant; restore only this disposable fixture.
  const db = authClient().db('platform-test');
  await db
    .collection('platformRoles')
    .updateOne(
      { _id: 'super-admin' } as never,
      { $set: { userId: String(adminId), role: 'super-admin' } },
      { upsert: true },
    );
  const result = await getPlatformAudit({ q: 'platform.super_admin.seeded', page: '9999' });
  expect(result.total).toBe(1);
  expect(result.page).toBe(1);
  expect(result.rows[0].action).toBe('platform.super_admin.seeded');
  expect(Object.keys(result.rows[0]).sort()).toEqual([
    'action',
    'actorId',
    'createdAt',
    'id',
    'organizationId',
    'source',
  ]);
  expect((await getPlatformAudit({ q: '.*' })).total).toBe(0);
});
