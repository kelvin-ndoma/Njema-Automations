import 'server-only';
import { ObjectId, type Db, type MongoClient } from 'mongodb';
// CLI migration boundary: authenticate using an actual persisted database session,
// then recheck the singleton grant within the migration transaction.
export async function initializeLegacyLifecycle(
  db: Db,
  client: MongoClient,
  actorId: string,
  token: string,
) {
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => {
      const identityIds = ObjectId.isValid(actorId) ? [actorId, new ObjectId(actorId)] : [actorId];
      const persisted = await db
        .collection('session')
        .findOne(
          { token, userId: { $in: identityIds }, expiresAt: { $gt: new Date() } },
          { session, projection: { _id: 1 } },
        );
      const grant = await db
        .collection('platformRoles')
        .findOne(
          { _id: 'super-admin' as never, userId: actorId, role: 'super-admin' },
          { session, projection: { _id: 1 } },
        );
      if (!persisted || !grant) throw new Error('Authenticated Super Admin session required.');
      const missing = { $or: [{ status: { $exists: false } }, { status: null }, { status: '' }] };
      const rows = await db
        .collection('organizations')
        .find(missing, { session, projection: { _id: 1 } })
        .limit(1000)
        .toArray();
      for (const row of rows) {
        await db
          .collection('organizations')
          .updateOne(
            { _id: row._id, ...missing },
            { $set: { status: 'active', statusChangedAt: new Date() } },
            { session },
          );
        await db.collection('platformAudit').insertOne(
          {
            actorId,
            organizationId: row._id,
            resourceId: String(row._id),
            action: 'organization.lifecycle.initialized',
            createdAt: new Date(),
          },
          { session },
        );
      }
      return rows.length;
    });
  } finally {
    await session.endSession();
  }
}
