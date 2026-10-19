import 'server-only';
import { ObjectId } from 'mongodb';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
import { defaultSettings } from './operations-input';
import { getPlatformGrant } from './repository';

export type SupportAccessView = {
  id: string;
  reason: string;
  expiresAt: string | null;
};

/** Active, actor-bound, unexpired read-only support grant for an organization. */
export async function activeSupportAccess(
  userId: string,
  organizationId: string,
): Promise<SupportAccessView | null> {
  if (!ObjectId.isValid(organizationId)) return null;
  const row = await authClient()
    .db(getEnv().MONGODB_DB)
    .collection('supportAccess')
    .findOne(
      {
        organizationId: new ObjectId(organizationId),
        actorId: userId,
        exitedAt: null,
        expiresAt: { $gt: new Date() },
        mode: 'read-only',
      },
      { projection: { _id: 1, reason: 1, expiresAt: 1 } },
    );
  if (!row) return null;
  return {
    id: String(row._id),
    reason: typeof row.reason === 'string' ? row.reason : '',
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : null,
  };
}

/**
 * Platform operators (Super Admin / Platform Admin) may open any organization
 * workspace in read-only Support Mode. If no active grant exists, create one
 * with an audit trail — still not membership and never a write bypass.
 */
export async function ensureOperatorSupportAccess(
  userId: string,
  organizationId: string,
): Promise<SupportAccessView | null> {
  if (!ObjectId.isValid(organizationId)) return null;
  const existing = await activeSupportAccess(userId, organizationId);
  if (existing) return existing;

  const db = authClient().db(getEnv().MONGODB_DB);
  const role = await getPlatformGrant(db, userId);
  if (!role) return null;

  const settings = await db
    .collection('platformSettings')
    .findOne({ _id: 'platform' as never }, { projection: { supportEnabled: 1, supportMinutes: 1 } });
  if (settings?.supportEnabled === false) return null;

  const now = new Date();
  const minutes = Number(settings?.supportMinutes ?? defaultSettings.supportMinutes);
  const expiresAt = new Date(now.getTime() + minutes * 60_000);
  const orgObjectId = new ObjectId(organizationId);
  const reason = 'Platform operator workspace inspection';

  const inserted = await db.collection('supportAccess').insertOne({
    organizationId: orgObjectId,
    actorId: userId,
    reason,
    expiresAt,
    exitedAt: null,
    createdAt: now,
    mode: 'read-only',
    enteredVia: 'workspace-open',
  });
  await db.collection('platformAudit').insertOne({
    actorId: userId,
    action: 'support.enter',
    organizationId: orgObjectId,
    resourceId: String(inserted.insertedId),
    reason,
    createdAt: now,
  });

  return {
    id: String(inserted.insertedId),
    reason,
    expiresAt: expiresAt.toISOString(),
  };
}
