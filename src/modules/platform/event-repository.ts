import 'server-only';
import { ObjectId } from 'mongodb';
import { requirePlatformOperator } from './service';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
export async function getAdministrativeEvents(organizationId?: string) {
  await requirePlatformOperator();
  const db = authClient().db(getEnv().MONGODB_DB);
  const filter =
    organizationId && ObjectId.isValid(organizationId)
      ? { organizationId: new ObjectId(organizationId) }
      : {};
  const rows = await db
    .collection('billingEvents')
    .find(filter, { projection: { action: 1, organizationId: 1, state: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();
  return rows.map((row) => ({
    id: String(row._id),
    action: typeof row.action === 'string' ? row.action : '',
    state: typeof row.state === 'string' ? row.state : '',
    organizationId: row.organizationId ? String(row.organizationId) : '',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
  }));
}
export async function getSecurityEvent(key: string) {
  await requirePlatformOperator();
  const db = authClient().db(getEnv().MONGODB_DB);
  // Next route parameters may retain percent-encoded path delimiters.
  let decoded: string;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return null;
  }
  const parts = decoded.split(':');
  if (parts.length !== 2) return null;
  const [source, value] = parts;
  if (!['identity', 'organization', 'platform'].includes(source) || !ObjectId.isValid(value ?? ''))
    return null;
  const collection =
    source === 'identity'
      ? 'identityAudit'
      : source === 'platform'
        ? 'platformAudit'
        : 'auditevents';
  const row = await db
    .collection(collection)
    .findOne(
      { _id: new ObjectId(value) },
      { projection: { action: 1, actorId: 1, organizationId: 1, resourceId: 1, createdAt: 1 } },
    );
  if (!row) return null;
  return {
    id: decoded,
    action: typeof row.action === 'string' ? row.action : '',
    actorId: typeof row.actorId === 'string' ? row.actorId : '',
    organizationId: row.organizationId ? String(row.organizationId) : '',
    resourceId: typeof row.resourceId === 'string' ? row.resourceId : '',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
    source,
  };
}
