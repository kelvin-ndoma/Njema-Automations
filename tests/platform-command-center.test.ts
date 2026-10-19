import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { connectDb, authClient } from '@/server/db';
import {
  Organization,
  Membership,
  AuditEvent,
  MutationLimit,
} from '@/modules/organizations/models';
import { SalesEmployee } from '@/modules/employees/models';
import { DailyAIUsage, TestConversationRecord } from '@/modules/conversations/models';
import { workspaceFor, saveBusinessSettings } from '@/modules/organizations/service';
import { readConfiguration, writeConfiguration } from '@/modules/employees/repository';
import { reserveTest, completeTest } from '@/modules/conversations/repository';
import {
  performPlatformOperation,
  getPlatformSettings,
  getOperationsDirectory,
  getOrganizationOperations,
  getUserOperations,
  getSupportAccess,
  getSupportRequest,
} from '@/modules/platform/operations-repository';
import { getOperationalMetrics, getSystemHealth } from '@/modules/platform/operations-reporting';
import { getSecurityEvent, getAdministrativeEvents } from '@/modules/platform/event-repository';
import { createPlatformIndexes } from '@/modules/platform/indexes';
import { operationInput } from '@/modules/platform/operations-input';
import { initializeLegacyLifecycle } from '@/modules/platform/lifecycle-migration';
const state = vi.hoisted(() => ({ id: '' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => {
    if (!state.id) throw new Error('SIGN_IN_REQUIRED');
    return { id: state.id };
  },
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
let replica: MongoMemoryReplSet | undefined;
const adminId = new ObjectId();
const ownerId = new ObjectId();
const userId = new ObjectId();
let orgId = '';
let otherOrgId = '';
const profile = { name: 'Synthetic Business', currency: 'USD', locale: 'en-US', timeZone: 'UTC' };
const reason = 'Synthetic operational test reason';
const db = () => authClient().db('command-center-test');
const reads = () => [
  () => getPlatformSettings(),
  () => getOperationsDirectory('billing', {}),
  () => getOrganizationOperations(orgId),
  () => getUserOperations(String(ownerId)),
  () => getOperationalMetrics(),
  () => getSystemHealth(),
  () => getSupportAccess(String(new ObjectId())),
  () => getSupportRequest(String(new ObjectId())),
  () => getSecurityEvent('platform:' + new ObjectId()),
  () => getAdministrativeEvents(),
];
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'command-center-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'command-center-test-secret-over-32-characters';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    SalesEmployee.createIndexes(),
    DailyAIUsage.createIndexes(),
    TestConversationRecord.createIndexes(),
    createPlatformIndexes(db()),
  ]);
  await db()
    .collection('user')
    .insertMany([
      { _id: adminId, email: 'admin@example.test' },
      { _id: ownerId, email: 'owner@example.test' },
      { _id: userId, email: 'target@example.test' },
    ]);
  await db()
    .collection<{ _id: string; userId: string; role: string }>('platformRoles')
    .insertOne({ _id: 'super-admin', userId: String(adminId), role: 'super-admin' });
  orgId = String((await Organization.create({ ...profile, slug: 'test-business' }))._id);
  otherOrgId = String((await Organization.create({ ...profile, slug: 'other-business' }))._id);
  await Membership.create({
    organizationId: orgId,
    userId: String(ownerId),
    role: 'owner',
    status: 'active',
  });
});
afterAll(async () => {
  await mongoose.disconnect();
  await authClient().close();
  await replica?.stop();
});
it('denies anonymous and tenant owners at every new read and mutation boundary', async () => {
  for (const actor of ['', String(ownerId)]) {
    state.id = actor;
    for (const read of reads())
      await expect(read()).rejects.toThrow(actor ? 'NOT_FOUND' : 'SIGN_IN_REQUIRED');
    await expect(
      performPlatformOperation({
        operation: 'organization.state',
        organizationId: orgId,
        status: 'suspended',
        confirmation: 'test-business',
        reason,
      }),
    ).rejects.toThrow(actor ? 'NOT_FOUND' : 'SIGN_IN_REQUIRED');
  }
  state.id = String(adminId);
});
it('validates bounded settings, model identifiers, support expiration and confirmation', async () => {
  expect(
    operationInput.safeParse({
      operation: 'settings.save',
      identity: 'Relay',
      dailyRequests: 1,
      dailyTokens: 1,
      trialDays: 14,
      supportMinutes: 31,
      reason,
      models: '',
    }).success,
  ).toBe(false);
  await expect(
    performPlatformOperation({
      operation: 'organization.state',
      organizationId: orgId,
      status: 'suspended',
      confirmation: 'wrong-organization',
      reason,
    }),
  ).rejects.toThrow('Confirmation');
  expect((await Organization.findById(orgId))?.status).toBe('active');
});
it('suspends reads, direct repositories and settings without deleting tenant data, then restores access', async () => {
  await performPlatformOperation({
    operation: 'organization.state',
    organizationId: orgId,
    status: 'suspended',
    confirmation: 'test-business',
    reason,
  });
  await expect(workspaceFor(String(ownerId), 'test-business')).rejects.toThrow('access denied');
  await expect(readConfiguration(orgId, String(ownerId))).rejects.toThrow('access denied');
  await expect(saveBusinessSettings(String(ownerId), 'test-business', profile)).rejects.toThrow(
    'access denied',
  );
  expect(await Membership.countDocuments({ organizationId: orgId })).toBe(1);
  expect((await getOrganizationOperations(orgId)).requests).toBe(0);
  await performPlatformOperation({
    operation: 'organization.state',
    organizationId: orgId,
    status: 'active',
    confirmation: 'test-business',
    reason,
  });
  expect((await workspaceFor(String(ownerId), 'test-business')).role).toBe('owner');
});
it('enforces read-only and AI restrictions in actual execution repositories', async () => {
  await performPlatformOperation({
    operation: 'organization.restrictions',
    organizationId: orgId,
    readOnly: 'on',
    aiDisabled: 'on',
    confirmation: 'test-business',
    reason,
  });
  expect((await workspaceFor(String(ownerId), 'test-business')).name).toBe(profile.name);
  await expect(
    workspaceFor(String(ownerId), 'test-business', 'organization:update'),
  ).rejects.toThrow('access denied');
  await expect(
    writeConfiguration(orgId, String(ownerId), {
      name: 'Assistant',
      instructions: 'Ask useful questions.',
      knowledge: 'Business hours are Monday to Friday.',
      fallback: 'Please contact the team.',
      goal: 'Qualify interest and collect contact details.',
      qualificationCriteria: 'Confirm need and timing.',
      escalationRules: 'Escalate when a human is requested.',
      allowedActions: ['continue', 'request_contact', 'escalate_human', 'record_qualification'],
      revision: 0,
    }),
  ).rejects.toThrow('access denied');
  await performPlatformOperation({
    operation: 'organization.restrictions',
    organizationId: orgId,
    readOnly: 'off',
    aiDisabled: 'on',
    confirmation: 'test-business',
    reason,
  });
  await expect(
    reserveTest(orgId, String(ownerId), {
      question: 'Help me',
      requestId: crypto.randomUUID(),
      reservedTokens: 1000,
      model: 'synthetic-model',
      employeeRevision: 1,
    }),
  ).rejects.toThrow('disabled');
  await performPlatformOperation({
    operation: 'organization.restrictions',
    organizationId: orgId,
    readOnly: 'off',
    aiDisabled: 'off',
    confirmation: 'test-business',
    reason,
  });
});
it('protects the sole administrator and revokes only the target account sessions', async () => {
  await expect(
    performPlatformOperation({
      operation: 'user.state',
      userId: String(adminId),
      restricted: 'on',
      confirmation: 'admin@example.test',
      reason,
    }),
  ).rejects.toThrow('sole Super Admin');
  await expect(
    performPlatformOperation({
      operation: 'user.sessions',
      userId: String(adminId),
      confirmation: 'admin@example.test',
      reason,
    }),
  ).rejects.toThrow('sole Super Admin');
  await db()
    .collection('session')
    .insertMany([
      {
        userId: String(userId),
        token: 'synthetic-target-token',
        expiresAt: new Date(Date.now() + 10000),
      },
      {
        userId: String(adminId),
        token: 'synthetic-admin-token',
        expiresAt: new Date(Date.now() + 10000),
      },
    ]);
  await performPlatformOperation({
    operation: 'user.state',
    userId: String(userId),
    restricted: 'on',
    confirmation: 'target@example.test',
    reason,
  });
  expect((await getUserOperations(String(userId))).restricted).toBe(true);
  expect(
    await db()
      .collection('session')
      .countDocuments({ userId: String(userId) }),
  ).toBe(0);
  expect(
    await db()
      .collection('session')
      .countDocuments({ userId: String(adminId) }),
  ).toBe(1);
});
it('persists notes without exposing employee knowledge, credentials or customer content', async () => {
  await performPlatformOperation({
    operation: 'organization.note',
    organizationId: orgId,
    note: 'Synthetic internal business note',
  });
  await SalesEmployee.create({
    organizationId: orgId,
    name: 'Synthetic employee',
    instructions: 'private-marker',
    knowledge: 'private-marker',
    fallback: 'private-marker',
    goal: 'private-marker',
    qualificationCriteria: 'private-marker',
    escalationRules: 'private-marker',
    allowedActions: ['continue'],
    revision: 1,
  });
  const data = await getOrganizationOperations(orgId);
  expect(data.notes[0].note).toContain('Synthetic');
  expect(data.employees[0].name).toBe('Synthetic employee');
  expect(JSON.stringify(data)).not.toContain('private-marker');
  expect((await getOrganizationOperations(otherOrgId)).notes).toHaveLength(0);
});
it('creates provider-agnostic plans, entitlements and real administrative billing events without payment records', async () => {
  const plan = await performPlatformOperation({
    operation: 'plan.save',
    id: '',
    code: 'pilot-plan',
    name: 'Synthetic Pilot',
    currency: 'USD',
    monthlyPrice: '',
    dailyRequests: 2,
    dailyTokens: 5000,
    aiEnabled: 'on',
    enabled: 'on',
    reason,
  });
  await performPlatformOperation({
    operation: 'subscription.assign',
    organizationId: orgId,
    planId: plan!.resourceId,
    state: 'trial',
    confirmation: 'test-business',
    reason,
  });
  expect((await getOrganizationOperations(orgId)).subscription?.paymentStatus).toBe('unconfigured');
  expect((await getOperationalMetrics()).trials).toBe(1);
  expect(await getAdministrativeEvents(orgId)).toHaveLength(1);
  expect(await db().collection('payments').countDocuments()).toBe(0);
  await db()
    .collection('organizationSubscriptions')
    .updateOne({ organizationId: new ObjectId(orgId) }, { $set: { trialEndsAt: new Date(0) } });
  await expect(
    reserveTest(orgId, String(ownerId), {
      question: 'Help me',
      requestId: crypto.randomUUID(),
      reservedTokens: 1000,
      model: 'synthetic-model',
      employeeRevision: 1,
    }),
  ).rejects.toThrow('subscription');
});
it('auto-enters audited support mode when Super Admin opens a non-member workspace', async () => {
  expect(
    await Membership.countDocuments({ organizationId: otherOrgId, userId: String(adminId) }),
  ).toBe(0);
  const workspace = await workspaceFor(String(adminId), 'other-business');
  expect(workspace.role).toBe('viewer');
  expect(workspace.readOnly).toBe(true);
  expect(workspace.supportMode?.id).toBeTruthy();
  const again = await workspaceFor(String(adminId), 'other-business');
  expect(again.supportMode?.id).toBe(workspace.supportMode?.id);
  expect(
    await db()
      .collection('platformAudit')
      .countDocuments({
        action: 'support.enter',
        actorId: String(adminId),
        organizationId: new ObjectId(otherOrgId),
      }),
  ).toBe(1);
  await expect(workspaceFor(String(userId), 'other-business')).rejects.toThrow('access denied');
});
it('requires explicit reason, scopes support notes and expires/revokes read-only support grants', async () => {
  const ticket = await performPlatformOperation({
    operation: 'support.create',
    organizationId: orgId,
    subject: 'Synthetic support request',
    note: 'Initial internal support note',
  });
  await performPlatformOperation({
    operation: 'support.update',
    id: ticket!.resourceId,
    state: 'in_progress',
    assigned: 'on',
    note: 'Follow-up internal support note',
    reason,
  });
  const request = await getSupportRequest(ticket!.resourceId);
  expect(request?.assigned).toBe(true);
  expect(request?.notes).toHaveLength(2);
  const access = await performPlatformOperation({
    operation: 'support.enter',
    organizationId: orgId,
    confirmation: 'test-business',
    reason,
  });
  const view = await getSupportAccess(access!.resourceId);
  expect(view?.organizationId).toBe(orgId);
  expect(view).not.toHaveProperty('knowledge');
  await db()
    .collection('supportAccess')
    .updateOne({ _id: new ObjectId(access!.resourceId) }, { $set: { expiresAt: new Date(0) } });
  expect(await getSupportAccess(access!.resourceId)).toBeNull();
  await performPlatformOperation({ operation: 'support.exit', id: access!.resourceId });
  expect(await getSupportAccess(access!.resourceId)).toBeNull();
});
it('persists and applies settings/model pricing while refusing cost ceilings without rates', async () => {
  await performPlatformOperation({
    operation: 'settings.save',
    identity: 'Synthetic Relay',
    dailyRequests: 20,
    dailyTokens: 100000,
    trialDays: 7,
    supportMinutes: 5,
    supportEnabled: 'on',
    aiEnabled: 'on',
    models: 'synthetic-model',
    dailyCostUsd: 0.001,
    reason,
  });
  expect((await getPlatformSettings()).supportMinutes).toBe(5);
  await expect(
    reserveTest(otherOrgId, 'outsider', {
      question: 'Help me',
      requestId: crypto.randomUUID(),
      reservedTokens: 1000,
      model: 'synthetic-model',
      employeeRevision: 1,
    }),
  ).rejects.toThrow('access denied');
  await Membership.create({
    organizationId: otherOrgId,
    userId: String(ownerId),
    role: 'owner',
    status: 'active',
  });
  await expect(
    reserveTest(otherOrgId, String(ownerId), {
      question: 'Help me',
      requestId: crypto.randomUUID(),
      reservedTokens: 1000,
      model: 'synthetic-model',
      employeeRevision: 1,
    }),
  ).rejects.toThrow('rate policy');
  await performPlatformOperation({
    operation: 'model.save',
    model: 'synthetic-model',
    enabled: 'on',
    inputUsdPerMillion: 100,
    outputUsdPerMillion: 100,
    reason,
  });
  await expect(
    reserveTest(otherOrgId, String(ownerId), {
      question: 'Help me',
      requestId: crypto.randomUUID(),
      reservedTokens: 1000,
      model: 'synthetic-model',
      employeeRevision: 1,
    }),
  ).rejects.toThrow('allowance');
});
it('reserves and reconciles priced AI usage without inventing costs for unresolved requests', async () => {
  await performPlatformOperation({
    operation: 'settings.save',
    identity: 'Synthetic Relay',
    dailyRequests: 20,
    dailyTokens: 100000,
    trialDays: 7,
    supportMinutes: 5,
    supportEnabled: 'on',
    aiEnabled: 'on',
    models: 'synthetic-model',
    dailyCostUsd: 1,
    reason,
  });
  await performPlatformOperation({
    operation: 'model.save',
    model: 'synthetic-model',
    enabled: 'on',
    inputUsdPerMillion: 1,
    outputUsdPerMillion: 2,
    reason,
  });
  const reservation = await reserveTest(otherOrgId, String(ownerId), {
    question: 'Synthetic priced question',
    requestId: crypto.randomUUID(),
    reservedTokens: 1000,
    model: 'synthetic-model',
    employeeRevision: 1,
  });
  const day = new Date().toISOString().slice(0, 10);
  expect(
    (await DailyAIUsage.findOne({ organizationId: otherOrgId, day }))?.committedCostMicroUsd,
  ).toBe(2000);
  await completeTest(otherOrgId, String(ownerId), reservation.id, {
    answer: 'Synthetic provider result',
    grounded: false,
    inputTokens: 100,
    outputTokens: 50,
  });
  expect((await TestConversationRecord.findById(reservation.id))?.costMicroUsd).toBe(200);
  expect(
    (await DailyAIUsage.findOne({ organizationId: otherOrgId, day }))?.committedCostMicroUsd,
  ).toBe(200);
  expect((await getOrganizationOperations(otherOrgId)).costMicroUsd).toBe(200);
  await reserveTest(otherOrgId, String(ownerId), {
    question: 'Synthetic unresolved question',
    requestId: crypto.randomUUID(),
    reservedTokens: 1000,
    model: 'synthetic-model',
    employeeRevision: 1,
  });
  expect((await getOrganizationOperations(otherOrgId)).costMicroUsd).toBeNull();
  expect((await getOperationalMetrics()).costMicroUsd).toBeNull();
});
it('persists manual incidents and returns truthful non-sensitive health metadata', async () => {
  await performPlatformOperation({
    operation: 'incident.save',
    subject: 'Synthetic incident',
    state: 'investigating',
    note: 'Synthetic investigation notes',
  });
  expect((await getOperationalMetrics()).incidents).toBe(1);
  const incident = await db()
    .collection('operationalIncidents')
    .findOne({ subject: 'Synthetic incident' });
  expect(incident).not.toBeNull();
  await performPlatformOperation({
    operation: 'incident.resolve',
    id: String(incident!._id),
    reason,
  });
  expect((await getOperationalMetrics()).incidents).toBe(0);
  const event = await db().collection('platformAudit').findOne({ action: 'incident.resolve' });
  const details = await getSecurityEvent('platform:' + String(event!._id));
  expect(details?.action).toBe('incident.resolve');
  expect(details?.resourceId).toBe(String(incident!._id));
  expect(await getSecurityEvent('platform%3A' + String(event!._id))).toEqual(details);
  expect(await getSecurityEvent('platform%ZZ')).toBeNull();
  expect(await getSecurityEvent('platform:' + event!._id + ':extra')).toBeNull();
  const health = await getSystemHealth();
  expect(health.database).toBe('Connected');
  expect(health.jobs).toContain('follow-up');
  expect(health.jobs).toContain('no always-on worker');
  expect(JSON.stringify(health)).not.toContain('mongodb');
});
it('rolls back privileged changes if audit persistence fails', async () => {
  const collection = db().collection('platformAudit');
  const prototype = Object.getPrototypeOf(collection) as { insertOne: typeof collection.insertOne };
  const original = prototype.insertOne;
  const spy = vi.spyOn(prototype, 'insertOne').mockImplementation(function (
    this: typeof collection,
    ...args: Parameters<typeof collection.insertOne>
  ) {
    if (this.collectionName === 'platformAudit')
      return Promise.reject(new Error('synthetic audit failure'));
    return original.apply(this, args);
  });
  try {
    await expect(
      performPlatformOperation({
        operation: 'organization.state',
        organizationId: orgId,
        status: 'suspended',
        confirmation: 'test-business',
        reason,
      }),
    ).rejects.toThrow('synthetic audit failure');
  } finally {
    spy.mockRestore();
  }
  expect((await Organization.findById(orgId))?.status).toBe('active');
});
it('requires a live database session for lifecycle migration and preserves explicit suspensions', async () => {
  const legacy = await db()
    .collection('organizations')
    .insertOne({ ...profile, slug: 'legacy-business', createdAt: new Date() });
  await db()
    .collection('organizations')
    .updateOne({ _id: new ObjectId(otherOrgId) }, { $set: { status: 'suspended' } });
  await expect(
    initializeLegacyLifecycle(db(), authClient(), String(adminId), 'invalid-token'),
  ).rejects.toThrow('Authenticated');
  await db()
    .collection('session')
    .insertOne({
      userId: String(adminId),
      token: 'synthetic-migration-token',
      expiresAt: new Date(Date.now() + 60000),
    });
  expect(
    await initializeLegacyLifecycle(
      db(),
      authClient(),
      String(adminId),
      'synthetic-migration-token',
    ),
  ).toBe(1);
  expect((await db().collection('organizations').findOne({ _id: legacy.insertedId }))?.status).toBe(
    'active',
  );
  expect((await Organization.findById(otherOrgId))?.status).toBe('suspended');
  expect(
    await initializeLegacyLifecycle(
      db(),
      authClient(),
      String(adminId),
      'synthetic-migration-token',
    ),
  ).toBe(0);
});
it('revoked platform grants deny every direct read and mutation immediately', async () => {
  await db().collection<{ _id: string }>('platformRoles').deleteOne({ _id: 'super-admin' });
  for (const read of reads()) await expect(read()).rejects.toThrow('NOT_FOUND');
  await expect(
    performPlatformOperation({
      operation: 'organization.note',
      organizationId: orgId,
      note: 'Blocked note',
    }),
  ).rejects.toThrow('NOT_FOUND');
});
