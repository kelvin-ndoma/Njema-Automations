import 'server-only';
import type { Db } from 'mongodb';
export async function createPlatformIndexes(db: Db) {
  await Promise.all([
    db.collection('organizations').createIndex({ status: 1, createdAt: -1 }),
    db.collection('organizations').createIndex({ createdAt: -1, _id: -1 }),
    db.collection('user').createIndex({ createdAt: -1, _id: -1 }),
    db.collection('organizationControls').createIndex({ organizationId: 1 }, { unique: true }),
    db.collection('userControls').createIndex({ userId: 1 }, { unique: true }),
    db.collection('subscriptionPlans').createIndex({ code: 1 }, { unique: true }),
    db.collection('organizationSubscriptions').createIndex({ organizationId: 1 }, { unique: true }),
    db.collection('modelPolicies').createIndex({ model: 1 }, { unique: true }),
    db.collection('platformAudit').createIndex({ organizationId: 1, createdAt: -1 }),
    db.collection('platformAudit').createIndex({ actorId: 1, createdAt: -1 }),
    db.collection('identityAudit').createIndex({ actorId: 1, createdAt: -1 }),
    db.collection('administrativeNotes').createIndex({ organizationId: 1, createdAt: -1 }),
    db.collection('supportRequests').createIndex({ organizationId: 1, state: 1, createdAt: -1 }),
    db.collection('supportNotes').createIndex({ organizationId: 1, requestId: 1, createdAt: -1 }),
    db.collection('supportAccess').createIndex({ actorId: 1, expiresAt: 1 }),
    db.collection('billingEvents').createIndex({ organizationId: 1, createdAt: -1 }),
    db.collection('operationalIncidents').createIndex({ state: 1, createdAt: -1 }),
  ]);
}
