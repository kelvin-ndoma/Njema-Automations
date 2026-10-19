import 'server-only';
import { cache } from 'react';
import { ObjectId, type Document } from 'mongodb';
import { requirePlatformOperator } from './service';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
import {
  defaultSettings,
  operationInput,
  currencyDecimals,
  priceToMinor,
} from './operations-input';
import { directoryInput, escapedSearch, type SearchParams } from './input';
import { enforceLimit } from '@/server/rate-limit';
import type { PlatformRole } from './repository';

/** Operations reserved for the singleton Super Admin. */
const superAdminOnlyOperations = new Set([
  'organization.state',
  'user.state',
  'user.sessions',
  'plan.save',
  'subscription.assign',
  'model.save',
  'settings.save',
]);

async function authorized() {
  const actor = await requirePlatformOperator();
  return { actor, db: authClient().db(getEnv().MONGODB_DB) };
}
const id = (value: string) => new ObjectId(value);
const date = (value: unknown) => (value instanceof Date ? value.toISOString() : null);
const str = (value: unknown) => (typeof value === 'string' ? value : '');
export type OperationsArea = 'billing' | 'ai' | 'support' | 'health' | 'settings';
export interface OperationalRow {
  id: string;
  label: string;
  organizationId: string;
  organizationName: string;
  status: string;
  detail: string;
  createdAt: string | null;
}

export async function performPlatformOperation(raw: unknown) {
  const { actor, db } = await authorized();
  const input = operationInput.parse(raw);
  await enforceLimit(`platform:${actor.id}`, 30);
  const session = authClient().startSession();
  try {
    return await session.withTransaction(async () => {
      const role = actor.platformRole as PlatformRole;
      if (!role) throw new Error('Platform access unavailable.');
      if (superAdminOnlyOperations.has(input.operation) && role !== 'super-admin') {
        throw new Error('This operation requires the Super Admin.');
      }
      // Re-verify grant inside the transaction so revoked access cannot race.
      const grant =
        role === 'super-admin'
          ? await db.collection('platformRoles').findOne(
              { _id: 'super-admin' as never, userId: actor.id, role: 'super-admin' },
              { session },
            )
          : await db.collection('platformRoles').findOne(
              {
                _id: `platform-admin:${actor.id}` as never,
                userId: actor.id,
                role: 'platform-admin',
              },
              { session },
            );
      if (!grant) throw new Error('Platform access unavailable.');
      const now = new Date();
      let organizationId: ObjectId | null =
        'organizationId' in input ? id(input.organizationId) : null;
      let targetId = '';
      const requireOrganization = async (confirm?: string) => {
        if (!organizationId) throw new Error('Organization unavailable.');
        const org = await db
          .collection('organizations')
          .findOne(
            { _id: organizationId },
            { session, projection: { _id: 1, slug: 1, status: 1 } },
          );
        if (!org) throw new Error('Organization unavailable.');
        if (confirm !== undefined && confirm !== org.slug)
          throw new Error('Confirmation must match the organization address.');
        return org;
      };
      const update = (collection: string, filter: Document, values: Document) =>
        db
          .collection(collection)
          .updateOne(
            filter,
            { $set: { ...values, updatedAt: now }, $setOnInsert: { createdAt: now } },
            { session, upsert: true },
          );
      switch (input.operation) {
        case 'organization.state':
          await requireOrganization(input.confirmation);
          await db
            .collection('organizations')
            .updateOne(
              { _id: organizationId! },
              { $set: { status: input.status, statusChangedAt: now, updatedAt: now } },
              { session },
            );
          break;
        case 'organization.restrictions':
          await requireOrganization(input.confirmation);
          await update(
            'organizationControls',
            { organizationId },
            { aiDisabled: input.aiDisabled, readOnly: input.readOnly },
          );
          break;
        case 'organization.note':
          await requireOrganization();
          targetId = String(
            (
              await db
                .collection('administrativeNotes')
                .insertOne(
                  { organizationId, actorId: actor.id, note: input.note, createdAt: now },
                  { session },
                )
            ).insertedId,
          );
          break;
        case 'user.state':
        case 'user.sessions': {
          const target = await db
            .collection('user')
            .findOne({ _id: { $in: [id(input.userId), input.userId] } } as Document, {
              session,
              projection: { _id: 1, email: 1 },
            });
          if (!target || input.confirmation !== target.email)
            throw new Error('Confirmation must match the account email.');
          targetId = String(target._id);
          if (targetId === grant.userId)
            throw new Error(
              'The sole Super Admin cannot be restricted or have sessions revoked here.',
            );
          if (input.operation === 'user.state')
            await update('userControls', { userId: targetId }, { restricted: input.restricted });
          if (input.operation === 'user.sessions' || input.restricted)
            await db
              .collection('session')
              .deleteMany({ userId: { $in: [targetId, id(input.userId)] } }, { session });
          break;
        }
        case 'plan.save': {
          const planId = input.id ? id(input.id) : new ObjectId();
          if (
            input.id &&
            !(await db
              .collection('subscriptionPlans')
              .findOne({ _id: planId }, { session, projection: { _id: 1 } }))
          )
            throw new Error('Plan unavailable.');
          await update(
            'subscriptionPlans',
            { _id: planId },
            {
              code: input.code,
              name: input.name,
              currency: input.currency,
              monthlyPriceMinor: priceToMinor(input.currency, input.monthlyPrice),
              priceDecimals: currencyDecimals(input.currency),
              dailyRequests: input.dailyRequests,
              dailyTokens: input.dailyTokens,
              aiEnabled: input.aiEnabled,
              enabled: input.enabled,
            },
          );
          targetId = String(planId);
          break;
        }
        case 'subscription.assign': {
          await requireOrganization(input.confirmation);
          const plan = await db
            .collection('subscriptionPlans')
            .findOne({ _id: id(input.planId), enabled: true }, { session });
          if (!plan) throw new Error('Choose an enabled plan.');
          const settings = await db
            .collection('platformSettings')
            .findOne({ _id: 'platform' as never }, { session });
          await update(
            'organizationSubscriptions',
            { organizationId },
            {
              planId: plan._id,
              state: input.state,
              paymentStatus: 'unconfigured',
              trialEndsAt:
                input.state === 'trial'
                  ? new Date(
                      now.getTime() +
                        Number(settings?.trialDays ?? defaultSettings.trialDays) * 86400000,
                    )
                  : null,
              provider: null,
            },
          );
          await db.collection('billingEvents').insertOne(
            {
              organizationId,
              actorId: actor.id,
              action: 'subscription.administratively_assigned',
              state: input.state,
              planId: plan._id,
              createdAt: now,
            },
            { session },
          );
          break;
        }
        case 'model.save':
          await update(
            'modelPolicies',
            { model: input.model },
            {
              enabled: input.enabled,
              inputMicroUsdPerMillion: Math.round(input.inputUsdPerMillion * 1000000),
              outputMicroUsdPerMillion: Math.round(input.outputUsdPerMillion * 1000000),
            },
          );
          targetId = input.model;
          break;
        case 'support.create':
          await requireOrganization();
          targetId = String(
            (
              await db.collection('supportRequests').insertOne(
                {
                  organizationId,
                  subject: input.subject,
                  state: 'open',
                  assignedTo: null,
                  createdAt: now,
                  updatedAt: now,
                },
                { session },
              )
            ).insertedId,
          );
          await db.collection('supportNotes').insertOne(
            {
              organizationId,
              requestId: id(targetId),
              actorId: actor.id,
              note: input.note,
              createdAt: now,
            },
            { session },
          );
          break;
        case 'support.update': {
          const ticket = await db
            .collection('supportRequests')
            .findOne({ _id: id(input.id) }, { session, projection: { organizationId: 1 } });
          if (!ticket) throw new Error('Support request unavailable.');
          organizationId = ticket.organizationId;
          await requireOrganization();
          await update(
            'supportRequests',
            { _id: id(input.id), organizationId },
            { state: input.state, assignedTo: input.assigned ? actor.id : null },
          );
          if (input.note)
            await db.collection('supportNotes').insertOne(
              {
                organizationId,
                requestId: id(input.id),
                actorId: actor.id,
                note: input.note,
                createdAt: now,
              },
              { session },
            );
          targetId = input.id;
          break;
        }
        case 'support.enter': {
          await requireOrganization(input.confirmation);
          const settings = await db
            .collection('platformSettings')
            .findOne({ _id: 'platform' as never }, { session });
          if (settings?.supportEnabled === false)
            throw new Error('Support access is disabled by platform policy.');
          const expiresAt = new Date(
            now.getTime() +
              Number(settings?.supportMinutes ?? defaultSettings.supportMinutes) * 60000,
          );
          targetId = String(
            (
              await db.collection('supportAccess').insertOne(
                {
                  organizationId,
                  actorId: actor.id,
                  reason: input.reason,
                  expiresAt,
                  exitedAt: null,
                  createdAt: now,
                  mode: 'read-only',
                },
                { session },
              )
            ).insertedId,
          );
          break;
        }
        case 'support.exit': {
          const access = await db
            .collection('supportAccess')
            .findOne(
              { _id: id(input.id), actorId: actor.id },
              { session, projection: { organizationId: 1 } },
            );
          if (!access) throw new Error('Support access unavailable.');
          organizationId = access.organizationId;
          await db
            .collection('supportAccess')
            .updateOne(
              { _id: id(input.id), actorId: actor.id },
              { $set: { exitedAt: now } },
              { session },
            );
          targetId = input.id;
          break;
        }
        case 'incident.save':
          targetId = String(
            (
              await db.collection('operationalIncidents').insertOne(
                {
                  subject: input.subject,
                  state: input.state,
                  note: input.note,
                  actorId: actor.id,
                  createdAt: now,
                },
                { session },
              )
            ).insertedId,
          );
          break;
        case 'incident.resolve': {
          const result = await db
            .collection('operationalIncidents')
            .updateOne(
              { _id: id(input.id) },
              { $set: { state: 'resolved', resolvedAt: now, updatedAt: now } },
              { session },
            );
          if (!result.matchedCount) throw new Error('Incident unavailable.');
          targetId = input.id;
          break;
        }
        case 'settings.save': {
          const { operation: _operation, reason: _reason, ...settings } = input;
          void _operation;
          void _reason;
          await update('platformSettings', { _id: 'platform' }, settings);
          break;
        }
      }
      await db.collection('platformAudit').insertOne(
        {
          actorId: actor.id,
          action: input.operation,
          organizationId,
          resourceId: targetId || String(organizationId ?? ''),
          reason: 'reason' in input ? input.reason : '',
          createdAt: now,
        },
        { session },
      );
      return { resourceId: targetId };
    });
  } finally {
    await session.endSession();
  }
}

export const getPlatformSettings = cache(async () => {
  const { db } = await authorized();
  const row = await db.collection('platformSettings').findOne(
    { _id: 'platform' as never },
    {
      projection: {
        identity: 1,
        dailyRequests: 1,
        dailyTokens: 1,
        trialDays: 1,
        supportMinutes: 1,
        supportEnabled: 1,
        aiEnabled: 1,
        models: 1,
        dailyCostUsd: 1,
      },
    },
  );
  return {
    ...defaultSettings,
    ...(row
      ? {
          identity: str(row.identity),
          dailyRequests: Number(row.dailyRequests),
          dailyTokens: Number(row.dailyTokens),
          trialDays: Number(row.trialDays),
          supportMinutes: Number(row.supportMinutes),
          supportEnabled: row.supportEnabled === true,
          aiEnabled: row.aiEnabled === true,
          models: Array.isArray(row.models)
            ? row.models.filter((value): value is string => typeof value === 'string')
            : [],
          dailyCostUsd: typeof row.dailyCostUsd === 'number' ? row.dailyCostUsd : null,
        }
      : {}),
  };
});

export async function getOrganizationOperations(organizationId: string) {
  const { db } = await authorized();
  if (!ObjectId.isValid(organizationId)) throw new Error('Organization unavailable.');
  const scoped = { organizationId: id(organizationId) };
  const [controls, notes, employees, subscription, usage, support] = await Promise.all([
    db
      .collection('organizationControls')
      .findOne(scoped, { projection: { readOnly: 1, aiDisabled: 1 } }),
    db
      .collection('administrativeNotes')
      .find(scoped, { projection: { note: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db
      .collection('salesemployees')
      .find(scoped, { projection: { name: 1, revision: 1, updatedAt: 1 } })
      .limit(20)
      .toArray(),
    db
      .collection('organizationSubscriptions')
      .findOne(scoped, { projection: { state: 1, paymentStatus: 1, planId: 1, trialEndsAt: 1 } }),
    db
      .collection('testconversationrecords')
      .aggregate([
        { $match: scoped },
        {
          $group: {
            _id: null,
            requests: { $sum: 1 },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            costs: { $sum: '$costMicroUsd' },
            costRecords: { $sum: { $cond: [{ $isNumber: '$costMicroUsd' }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    db.collection('supportRequests').countDocuments(scoped),
  ]);
  const plan = subscription?.planId
    ? await db
        .collection('subscriptionPlans')
        .findOne({ _id: subscription.planId }, { projection: { name: 1 } })
    : null;
  return {
    readOnly: controls?.readOnly === true,
    aiDisabled: controls?.aiDisabled === true,
    notes: notes.map((row) => ({
      id: String(row._id),
      note: str(row.note),
      createdAt: date(row.createdAt),
    })),
    employees: employees.map((row) => ({
      id: String(row._id),
      name: str(row.name),
      revision: Number(row.revision),
      updatedAt: date(row.updatedAt),
    })),
    subscription: subscription
      ? {
          state: str(subscription.state),
          paymentStatus: str(subscription.paymentStatus),
          planName: str(plan?.name),
          trialEndsAt: date(subscription.trialEndsAt),
        }
      : null,
    requests: Number(usage[0]?.requests ?? 0),
    tokens: Number(usage[0]?.inputTokens ?? 0) + Number(usage[0]?.outputTokens ?? 0),
    costMicroUsd:
      usage[0]?.costRecords && usage[0].costRecords === usage[0].requests
        ? Number(usage[0].costs)
        : null,
    supportRequests: support,
  };
}

export async function getUserOperations(userId: string) {
  const { db } = await authorized();
  if (!ObjectId.isValid(userId)) throw new Error('Account unavailable.');
  const [controls, sessions, events] = await Promise.all([
    db.collection('userControls').findOne({ userId }, { projection: { restricted: 1 } }),
    db
      .collection('session')
      .countDocuments({ userId: { $in: [userId, id(userId)] }, expiresAt: { $gt: new Date() } }),
    db
      .collection('identityAudit')
      .find({ actorId: userId }, { projection: { action: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
  ]);
  return {
    restricted: controls?.restricted === true,
    sessions,
    events: events.map((row) => ({
      id: String(row._id),
      action: str(row.action),
      createdAt: date(row.createdAt),
    })),
  };
}

export async function getOperationsDirectory(area: OperationsArea, params: SearchParams) {
  const { db } = await authorized();
  const input = directoryInput(params);
  const source = {
    billing: 'organizationSubscriptions',
    ai: 'salesemployees',
    support: 'supportRequests',
    health: 'operationalIncidents',
    settings: 'modelPolicies',
  }[area];
  const projection = {
    ...(area === 'health' ? { note: 1 } : {}),
    _id: 1,
    organizationId: 1,
    name: 1,
    subject: 1,
    state: 1,
    revision: 1,
    updatedAt: 1,
    createdAt: 1,
    planId: 1,
    paymentStatus: 1,
    model: 1,
    enabled: 1,
    assignedTo: 1,
  };
  const filter: Document = {};
  if (typeof params.organization === 'string' && ObjectId.isValid(params.organization))
    filter.organizationId = id(params.organization);
  if (input.q) {
    filter.$or = ['name', 'subject', 'model'].map((field) => ({
      [field]: { $regex: escapedSearch(input.q), $options: 'i' },
    }));
    const relatedOrganizations = await db
      .collection('organizations')
      .find(
        {
          $or: [
            { name: { $regex: escapedSearch(input.q), $options: 'i' } },
            { slug: { $regex: escapedSearch(input.q), $options: 'i' } },
          ],
        },
        { projection: { _id: 1 } },
      )
      .limit(500)
      .toArray();
    (filter.$or as Document[]).push({
      organizationId: { $in: relatedOrganizations.map((row) => row._id) },
    });
    if (area === 'billing') {
      const matchingPlans = await db
        .collection('subscriptionPlans')
        .find(
          { name: { $regex: escapedSearch(input.q), $options: 'i' } },
          { projection: { _id: 1 } },
        )
        .limit(100)
        .toArray();
      (filter.$or as Document[]).push({ planId: { $in: matchingPlans.map((row) => row._id) } });
    }
  }
  const state =
    typeof params.state === 'string' &&
    ['open', 'in_progress', 'resolved', 'trial', 'active', 'past_due', 'canceled'].includes(
      params.state,
    )
      ? params.state
      : '';
  if (state) filter.state = state;
  const total = await db.collection(source).countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / input.size));
  const page = Math.min(input.page, pages);
  const rows = await db
    .collection(source)
    .find(filter, { projection })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * input.size)
    .limit(input.size)
    .toArray();
  const orgs = await db
    .collection('organizations')
    .find({}, { projection: { _id: 1, name: 1, slug: 1 } })
    .sort({ name: 1 })
    .limit(500)
    .toArray();
  const plans = await db
    .collection('subscriptionPlans')
    .find(
      {},
      {
        projection: {
          code: 1,
          name: 1,
          enabled: 1,
          currency: 1,
          monthlyPriceMinor: 1,
          dailyRequests: 1,
          dailyTokens: 1,
          aiEnabled: 1,
        },
      },
    )
    .sort({ name: 1 })
    .limit(100)
    .toArray();
  const records: OperationalRow[] = rows.map((row) => ({
    id: String(row._id),
    label:
      str(row.name || row.subject || row.model) ||
      str(plans.find((plan) => String(plan._id) === String(row.planId))?.name) ||
      'Subscription',
    organizationId: row.organizationId ? String(row.organizationId) : '',
    organizationName: str(orgs.find((org) => String(org._id) === String(row.organizationId))?.name),
    status:
      str(row.state) ||
      (row.enabled === false ? 'disabled' : area === 'ai' ? 'configured' : 'enabled'),
    detail:
      area === 'billing'
        ? `Payment: ${str(row.paymentStatus) || 'unconfigured'}`
        : area === 'support'
          ? row.assignedTo
            ? 'Assigned to Super Admin'
            : 'Unassigned'
          : area === 'ai'
            ? `Revision ${Number(row.revision ?? 0)}`
            : area === 'health'
              ? str(row.note)
              : '',
    createdAt: date(row.createdAt || row.updatedAt),
  }));
  return {
    rows: records,
    total,
    pages,
    page,
    size: input.size,
    q: input.q,
    state,
    organizations: orgs.map((org) => ({
      id: String(org._id),
      name: str(org.name),
      slug: str(org.slug),
    })),
    plans: plans.map((plan) => ({
      id: String(plan._id),
      code: str(plan.code),
      name: str(plan.name),
      enabled: plan.enabled === true,
      currency: str(plan.currency),
      monthlyPrice:
        typeof plan.monthlyPriceMinor === 'number'
          ? plan.monthlyPriceMinor / 10 ** currencyDecimals(str(plan.currency))
          : null,
      dailyRequests: Number(plan.dailyRequests),
      dailyTokens: Number(plan.dailyTokens),
      aiEnabled: plan.aiEnabled === true,
    })),
  };
}

export async function getSupportRequest(requestId: string) {
  const { db } = await authorized();
  if (!ObjectId.isValid(requestId)) return null;
  const row = await db
    .collection('supportRequests')
    .findOne(
      { _id: id(requestId) },
      { projection: { subject: 1, state: 1, assignedTo: 1, organizationId: 1 } },
    );
  if (!row) return null;
  const notes = await db
    .collection('supportNotes')
    .find(
      { requestId: row._id, organizationId: row.organizationId },
      { projection: { note: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();
  return {
    id: String(row._id),
    subject: str(row.subject),
    state: str(row.state),
    assigned: !!row.assignedTo,
    organizationId: String(row.organizationId),
    notes: notes.map((note) => ({
      id: String(note._id),
      note: str(note.note),
      createdAt: date(note.createdAt),
    })),
  };
}

export async function getSupportAccess(accessId: string) {
  const { actor, db } = await authorized();
  if (!ObjectId.isValid(accessId)) return null;
  const settings = await getPlatformSettings();
  if (!settings.supportEnabled) return null;
  const access = await db.collection('supportAccess').findOne(
    {
      _id: id(accessId),
      actorId: actor.id,
      exitedAt: null,
      expiresAt: { $gt: new Date() },
      mode: 'read-only',
    },
    { projection: { organizationId: 1, reason: 1, expiresAt: 1 } },
  );
  if (!access) return null;
  const organizationId = access.organizationId;
  const scoped = { organizationId };
  const [org, controls, subscription, usage, openSupport, members, employees, notes, audit] =
    await Promise.all([
      db.collection('organizations').findOne(
        { _id: organizationId },
        { projection: { name: 1, slug: 1, status: 1, currency: 1, locale: 1, timeZone: 1 } },
      ),
      db
        .collection('organizationControls')
        .findOne(scoped, { projection: { readOnly: 1, aiDisabled: 1 } }),
      db
        .collection('organizationSubscriptions')
        .findOne(scoped, { projection: { state: 1, paymentStatus: 1, trialEndsAt: 1, planId: 1 } }),
      db
        .collection('testconversationrecords')
        .aggregate([
          { $match: scoped },
          {
            $group: {
              _id: null,
              requests: { $sum: 1 },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            },
          },
        ])
        .toArray(),
      db.collection('supportRequests').countDocuments({
        ...scoped,
        state: { $in: ['open', 'in_progress'] },
      }),
      db.collection('memberships').countDocuments({ ...scoped, status: 'active' }),
      db.collection('salesemployees').countDocuments(scoped),
      db
        .collection('administrativeNotes')
        .find(scoped, { projection: { note: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      db
        .collection('platformAudit')
        .find(scoped, { projection: { action: 1, reason: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray(),
    ]);
  if (!org) return null;
  await db.collection('platformAudit').insertOne({
    actorId: actor.id,
    action: 'support.read',
    organizationId,
    resourceId: accessId,
    createdAt: new Date(),
  });
  const plan = subscription?.planId
    ? await db
        .collection('subscriptionPlans')
        .findOne({ _id: subscription.planId }, { projection: { name: 1 } })
    : null;
  const failed = Number(usage[0]?.failed ?? 0);
  const pending = Number(usage[0]?.pending ?? 0);
  const issues: string[] = [];
  if (org.status === 'suspended') issues.push('Organization is suspended.');
  if (!org.status) issues.push('Lifecycle status is not recorded.');
  if (controls?.readOnly === true) issues.push('Customer workspace is forced read-only.');
  if (controls?.aiDisabled === true) issues.push('AI execution is disabled for this organization.');
  if (!subscription) issues.push('No subscription or trial is assigned.');
  else if (subscription.state === 'past_due') issues.push('Subscription is past due.');
  else if (subscription.state === 'canceled') issues.push('Subscription is canceled.');
  else if (
    subscription.state === 'trial' &&
    subscription.trialEndsAt instanceof Date &&
    subscription.trialEndsAt <= new Date()
  )
    issues.push('Trial has ended.');
  if (employees === 0) issues.push('No sales employee is configured.');
  if (members === 0) issues.push('No active memberships are recorded.');
  if (failed > 0) issues.push(`${failed} failed AI test request${failed === 1 ? '' : 's'}.`);
  if (pending > 0) issues.push(`${pending} pending AI reservation${pending === 1 ? '' : 's'}.`);
  if (openSupport > 0)
    issues.push(`${openSupport} open support request${openSupport === 1 ? '' : 's'}.`);
  return {
    id: accessId,
    organizationId: String(org._id),
    name: str(org.name),
    slug: str(org.slug),
    status: str(org.status),
    currency: str(org.currency),
    locale: str(org.locale),
    timeZone: str(org.timeZone),
    reason: str(access.reason),
    expiresAt: date(access.expiresAt),
    readOnly: controls?.readOnly === true,
    aiDisabled: controls?.aiDisabled === true,
    members,
    employees,
    openSupport,
    aiRequests: Number(usage[0]?.requests ?? 0),
    aiFailed: failed,
    aiPending: pending,
    subscription: subscription
      ? {
          state: str(subscription.state),
          paymentStatus: str(subscription.paymentStatus),
          planName: str(plan?.name),
          trialEndsAt: date(subscription.trialEndsAt),
        }
      : null,
    issues,
    notes: notes.map((row) => ({
      id: String(row._id),
      note: str(row.note),
      createdAt: date(row.createdAt),
    })),
    audit: audit.map((row) => ({
      id: String(row._id),
      action: str(row.action),
      reason: str(row.reason),
      createdAt: date(row.createdAt),
    })),
  };
}
