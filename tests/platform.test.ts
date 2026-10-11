import { beforeAll, afterAll, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';
import {
  seedSuperAdmin,
  hasSuperAdminGrant,
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
  await expect(seedSuperAdmin(client.db('missing'), client)).rejects.toThrow(
    'Create the requested account',
  );
});
it('grants only the requested user and is idempotent', async () => {
  const db = client.db('single');
  const id = new ObjectId();
  await db.collection('user').insertOne({ _id: id, email: SUPER_ADMIN_EMAIL });
  expect((await seedSuperAdmin(db, client))?.created).toBe(true);
  expect((await seedSuperAdmin(db, client))?.created).toBe(false);
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
  await db.collection('user').insertOne({ email: SUPER_ADMIN_EMAIL });
  await db
    .collection<{ _id: string; userId: string }>('platformRoles')
    .insertOne({ _id: 'super-admin', userId: 'other' });
  await expect(seedSuperAdmin(db, client)).rejects.toThrow('different super administrator');
  expect(await db.collection('identityAudit').countDocuments()).toBe(0);
});
