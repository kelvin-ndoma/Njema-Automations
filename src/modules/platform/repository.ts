import 'server-only';
import type { Db, MongoClient } from 'mongodb';
export const SUPER_ADMIN_EMAIL = 'kelvinndomamutua@gmail.com';
interface PlatformGrant {
  _id: string;
  userId: string;
  role: 'super-admin';
  createdAt: Date;
}
export async function seedSuperAdmin(db: Db, client: MongoClient) {
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => {
      const user = await db.collection('user').findOne({ email: SUPER_ADMIN_EMAIL }, { session });
      if (!user)
        throw new Error('Create the requested account before assigning its platform role.');
      const grants = db.collection<PlatformGrant>('platformRoles');
      const unexpected = await grants.countDocuments({ _id: { $ne: 'super-admin' } }, { session });
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
