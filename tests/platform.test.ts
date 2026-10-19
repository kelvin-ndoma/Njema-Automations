import { beforeAll, afterAll, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';
import {
  seedSuperAdmin,
  hasSuperAdminGrant,
  hasPlatformAccess,
  getPlatformGrant,
  grantPlatformAdmin,
  revokePlatformAdmin,
  SUPER_ADMIN_EMAIL,
} from '@/modules/platform/repository';
let replica: MongoMemoryReplSet;
let client: MongoClient;
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  client = new MongoClient(replica.getUri());
});
afterAll(async () => {
  await client?.close();
  await replica?.stop();
});
it('requires an existing authentication account', async () => {
  await expect(seedSuperAdmin(client.db('missing'), client, 'missing')).rejects.toThrow(
    'Create the requested account',
  );
});
it('grants only the requested user and is idempotent', async () => {
  const db = client.db('single');
  const id = new ObjectId();
  await db.collection('user').insertOne({ _id: id, email: SUPER_ADMIN_EMAIL });
  expect((await seedSuperAdmin(db, client, String(id)))?.created).toBe(true);
  expect((await seedSuperAdmin(db, client, String(id)))?.created).toBe(false);
  expect(await db.collection('platformRoles').countDocuments()).toBe(1);
  expect(
    await db.collection('identityAudit').countDocuments({ action: 'platform.super_admin.seeded' }),
  ).toBe(1);
  expect(await hasSuperAdminGrant(db, String(id))).toBe(true);
  expect(await hasSuperAdminGrant(db, 'another-user')).toBe(false);
  expect(await db.collection('memberships').countDocuments()).toBe(0);
  await db.collection<{ _id: string }>('platformRoles').deleteOne({ _id: 'super-admin' });
  expect(await hasSuperAdminGrant(db, String(id))).toBe(false);
});
it('refuses to replace another super-admin', async () => {
  const db = client.db('occupied');
  const user = await db.collection('user').insertOne({ email: SUPER_ADMIN_EMAIL });
  await db
    .collection<{ _id: string; userId: string }>('platformRoles')
    .insertOne({ _id: 'super-admin', userId: 'other' });
  await expect(seedSuperAdmin(db, client, String(user.insertedId))).rejects.toThrow(
    'different super administrator',
  );
  expect(await db.collection('identityAudit').countDocuments()).toBe(0);
});
it('refuses an email lookup without the authenticated account identity', async () => {
  const db = client.db('ownership');
  const id = new ObjectId();
  await db
    .collection('user')
    .insertOne({ _id: id, email: SUPER_ADMIN_EMAIL, emailVerified: false });
  await expect(seedSuperAdmin(db, client, '')).rejects.toThrow(
    'Authenticate the requested account',
  );
  await expect(seedSuperAdmin(db, client, String(new ObjectId()))).rejects.toThrow(
    'Authenticate the requested account',
  );
  expect(await db.collection('platformRoles').countDocuments()).toBe(0);
  expect(await db.collection('identityAudit').countDocuments()).toBe(0);
});

it('lets Super Admin grant and revoke Platform Admin without replacing Super Admin', async () => {
  const db = client.db('operators');
  const superId = new ObjectId();
  const adminId = new ObjectId();
  await db.collection('user').insertMany([
    { _id: superId, email: SUPER_ADMIN_EMAIL },
    { _id: adminId, email: 'platform.admin@example.test' },
  ]);
  await seedSuperAdmin(db, client, String(superId));
  expect((await grantPlatformAdmin(db, client, String(superId), String(adminId))).created).toBe(
    true,
  );
  expect(await getPlatformGrant(db, String(adminId))).toBe('platform-admin');
  expect(await hasPlatformAccess(db, String(adminId))).toBe(true);
  expect(await hasSuperAdminGrant(db, String(adminId))).toBe(false);
  expect(await hasSuperAdminGrant(db, String(superId))).toBe(true);
  await expect(grantPlatformAdmin(db, client, String(adminId), String(adminId))).rejects.toThrow(
    /Only the Super Admin/,
  );
  expect((await revokePlatformAdmin(db, client, String(superId), String(adminId))).revoked).toBe(
    true,
  );
  expect(await hasPlatformAccess(db, String(adminId))).toBe(false);
});
