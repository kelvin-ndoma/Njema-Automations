import 'server-only';
import { ObjectId, type Db, type MongoClient } from 'mongodb';

export const SUPER_ADMIN_EMAIL = 'kelvinndomamutua@gmail.com';

export type PlatformRole = 'super-admin' | 'platform-admin';

export interface PlatformGrant {
  _id: string;
  userId: string;
  role: PlatformRole;
  createdAt: Date;
  grantedBy?: string | null;
}

export function platformAdminGrantId(userId: string) {
  return `platform-admin:${userId}`;
}

// Call only with the identity obtained from a successful server-side authentication.
export async function seedSuperAdmin(db: Db, client: MongoClient, authenticatedUserId: string) {
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => {
      const user = await db.collection('user').findOne({ email: SUPER_ADMIN_EMAIL }, { session });
      if (!user)
        throw new Error('Create the requested account before assigning its platform role.');
      if (!authenticatedUserId || String(user._id) !== authenticatedUserId)
        throw new Error('Authenticate the requested account before assigning its platform role.');
      const grants = db.collection<PlatformGrant>('platformRoles');
      const unexpected = await grants.countDocuments(
        {
          $nor: [{ _id: 'super-admin' }, { role: 'platform-admin' }],
        },
        { session },
      );
      if (unexpected)
        throw new Error('Unexpected platform grants exist. Review them before seeding.');
      const current = await grants.findOne({ _id: 'super-admin' }, { session });
      const userId = String(user._id);
      if (current && current.userId !== userId)
        throw new Error('A different super administrator exists. Explicit transfer is required.');
      if (current) return { created: false, userId };
      await grants.insertOne(
        { _id: 'super-admin', userId, role: 'super-admin', createdAt: new Date() },
        { session },
      );
      await db.collection('identityAudit').insertOne(
        {
          actorId: userId,
          action: 'platform.super_admin.seeded',
          resourceId: userId,
          createdAt: new Date(),
        },
        { session },
      );
      return { created: true, userId };
    });
  } finally {
    await session.endSession();
  }
}

export async function hasSuperAdminGrant(db: Db, userId: string) {
  return !!(await db
    .collection<PlatformGrant>('platformRoles')
    .findOne({ _id: 'super-admin', userId, role: 'super-admin' }));
}

export async function getPlatformGrant(db: Db, userId: string): Promise<PlatformRole | null> {
  const superAdmin = await db
    .collection<PlatformGrant>('platformRoles')
    .findOne({ _id: 'super-admin', userId, role: 'super-admin' });
  if (superAdmin) return 'super-admin';
  const admin = await db
    .collection<PlatformGrant>('platformRoles')
    .findOne({ _id: platformAdminGrantId(userId), userId, role: 'platform-admin' });
  return admin ? 'platform-admin' : null;
}

export async function hasPlatformAccess(db: Db, userId: string) {
  return !!(await getPlatformGrant(db, userId));
}

export async function listPlatformGrants(db: Db) {
  const rows = await db
    .collection<PlatformGrant>('platformRoles')
    .find({ role: { $in: ['super-admin', 'platform-admin'] } })
    .sort({ role: 1, createdAt: 1 })
    .toArray();
  return rows.map((row) => ({
    id: row._id,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
    grantedBy: row.grantedBy ?? null,
  }));
}

export async function grantPlatformAdmin(
  db: Db,
  client: MongoClient,
  actorId: string,
  targetUserId: string,
) {
  if (!(await hasSuperAdminGrant(db, actorId)))
    throw new Error('Only the Super Admin can grant platform administrators.');
  if (await hasSuperAdminGrant(db, targetUserId))
    throw new Error('That account is already the Super Admin.');
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => {
      const idFilter = ObjectId.isValid(targetUserId)
        ? { _id: { $in: [new ObjectId(targetUserId), targetUserId] } }
        : { _id: targetUserId };
      const resolved = await db
        .collection('user')
        .findOne(idFilter as never, { session, projection: { _id: 1, email: 1 } });
      if (!resolved) throw new Error('Choose an existing user account.');
      const userId = String(resolved._id);
      const grantId = platformAdminGrantId(userId);
      const existing = await db
        .collection<PlatformGrant>('platformRoles')
        .findOne({ _id: grantId }, { session });
      if (existing) return { created: false, userId };
      await db.collection<PlatformGrant>('platformRoles').insertOne(
        {
          _id: grantId,
          userId,
          role: 'platform-admin',
          createdAt: new Date(),
          grantedBy: actorId,
        },
        { session },
      );
      await db.collection('identityAudit').insertOne(
        {
          actorId,
          action: 'platform.admin.granted',
          resourceId: userId,
          createdAt: new Date(),
        },
        { session },
      );
      return { created: true, userId };
    });
  } finally {
    await session.endSession();
  }
}

export async function revokePlatformAdmin(
  db: Db,
  client: MongoClient,
  actorId: string,
  targetUserId: string,
) {
  if (!(await hasSuperAdminGrant(db, actorId)))
    throw new Error('Only the Super Admin can revoke platform administrators.');
  if (targetUserId === actorId) throw new Error('You cannot revoke your own Super Admin grant.');
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => {
      const grantId = platformAdminGrantId(targetUserId);
      const result = await db
        .collection<PlatformGrant>('platformRoles')
        .deleteOne({ _id: grantId, role: 'platform-admin' }, { session });
      if (!result.deletedCount) throw new Error('Platform administrator grant not found.');
      await db.collection('identityAudit').insertOne(
        {
          actorId,
          action: 'platform.admin.revoked',
          resourceId: targetUserId,
          createdAt: new Date(),
        },
        { session },
      );
      return { revoked: true, userId: targetUserId };
    });
  } finally {
    await session.endSession();
  }
}
