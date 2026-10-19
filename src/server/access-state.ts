import 'server-only';
import { cache } from 'react';
import { authClient, connectDb } from './db';
import { getEnv } from './env';
import { AccessDenied, type Permission } from '@/modules/organizations/policy';
import mongoose from 'mongoose';
import type { ClientSession } from 'mongodb';

/** One restriction lookup per request — called from every authenticated page. */
export const userIsRestricted = cache(async (userId: string) => {
  return !!(await authClient()
    .db(getEnv().MONGODB_DB)
    .collection('userControls')
    .findOne({ userId, restricted: true }, { projection: { _id: 1 } }));
});
export async function assertOrganizationOperational(
  organizationId: string,
  session?: ClientSession,
) {
  await connectDb();
  const db = mongoose.connection.db!;
  const org = await db
    .collection('organizations')
    .findOne(
      { _id: new mongoose.Types.ObjectId(organizationId) },
      { session, projection: { status: 1, name: 1 } },
    );
  const controls = await db
    .collection('organizationControls')
    .findOne(
      { organizationId: new mongoose.Types.ObjectId(organizationId) },
      { session, projection: { readOnly: 1, aiDisabled: 1 } },
    );
  if (!org || org.status === 'suspended') throw new AccessDenied();
  return {
    name: typeof org.name === 'string' ? org.name : '',
    aiDisabled: controls?.aiDisabled === true,
    readOnly: controls?.readOnly === true,
  };
}

export async function assertTenantState(
  organizationId: string,
  userId: string,
  permission: Permission = 'workspace:read',
  session?: ClientSession,
) {
  const controls = await assertOrganizationOperational(organizationId, session);
  const db = mongoose.connection.db!;
  // MongoDB transaction sessions must never issue parallel operations.
  const user = await db
    .collection('userControls')
    .findOne({ userId, restricted: true }, { session, projection: { _id: 1 } });
  // Legacy absence preserves pre-migration access, but is never reported as active.
  // New organizations persist active; explicit initialization records the legacy decision.
  if (user || (permission !== 'workspace:read' && controls.readOnly)) throw new AccessDenied();
  return { aiDisabled: controls.aiDisabled, readOnly: controls.readOnly };
}
export async function recordAuthorizationDenial(
  userId: string,
  scope: 'platform' | 'organization',
) {
  await authClient()
    .db(getEnv().MONGODB_DB)
    .collection('identityAudit')
    .insertOne({ actorId: userId, action: `authorization.${scope}.denied`, createdAt: new Date() })
    .catch(() => {});
}
