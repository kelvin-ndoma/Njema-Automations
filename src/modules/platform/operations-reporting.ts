import 'server-only';
import { requirePlatformOperator } from './service';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
import { reportDays, type SearchParams } from './input';
import { getPlatformSettings } from './operations-repository';
export async function getOperationalMetrics(params: SearchParams = {}) {
  await requirePlatformOperator();
  const db = authClient().db(getEnv().MONGODB_DB);
  const days = reportDays(params);
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1),
  );
  const fromDay = from.toISOString().slice(0, 10);
  const toDay = now.toISOString().slice(0, 10);
  const [
    suspended,
    trials,
    activeSubscriptions,
    usage,
    trend,
    widgetUsage,
    widgetTrend,
    openSupport,
    incidents,
    untracked,
    models,
  ] = await Promise.all([
    db.collection('organizations').countDocuments({ status: 'suspended' }),
    db
      .collection('organizationSubscriptions')
      .countDocuments({ state: 'trial', trialEndsAt: { $gt: now } }),
    db.collection('organizationSubscriptions').countDocuments({ state: 'active' }),
    db
      .collection('testconversationrecords')
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: now } } },
        {
          $group: {
            _id: null,
            requests: { $sum: 1 },
            tokens: {
              $sum: { $add: [{ $ifNull: ['$inputTokens', 0] }, { $ifNull: ['$outputTokens', 0] }] },
            },
            errors: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            costs: { $sum: '$costMicroUsd' },
            priced: { $sum: { $cond: [{ $isNumber: '$costMicroUsd' }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    db
      .collection('testconversationrecords')
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: now } } },
        {
          $group: {
            _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'UTC' } },
            requests: { $sum: 1 },
            tokens: {
              $sum: { $add: [{ $ifNull: ['$inputTokens', 0] }, { $ifNull: ['$outputTokens', 0] }] },
            },
          },
        },
      ])
      .toArray(),
    db
      .collection('dailyaiusages')
      .aggregate([
        { $match: { day: { $gte: fromDay, $lte: toDay } } },
        {
          $group: {
            _id: null,
            requests: { $sum: '$requests' },
            tokens: { $sum: '$committedTokens' },
          },
        },
      ])
      .toArray(),
    db
      .collection('dailyaiusages')
      .aggregate([
        { $match: { day: { $gte: fromDay, $lte: toDay } } },
        {
          $group: {
            _id: '$day',
            requests: { $sum: '$requests' },
            tokens: { $sum: '$committedTokens' },
          },
        },
      ])
      .toArray(),
    db.collection('supportRequests').countDocuments({ state: { $in: ['open', 'in_progress'] } }),
    db.collection('operationalIncidents').countDocuments({ state: 'investigating' }),
    db.collection('organizations').countDocuments({ status: { $exists: false } }),
    db
      .collection('modelPolicies')
      .find(
        {},
        {
          projection: {
            model: 1,
            enabled: 1,
            inputMicroUsdPerMillion: 1,
            outputMicroUsdPerMillion: 1,
          },
        },
      )
      .sort({ model: 1 })
      .limit(100)
      .toArray(),
  ]);
  const row = usage[0];
  const widgetRow = widgetUsage[0];
  const testRequests = Number(row?.requests ?? 0);
  const widgetRequests = Number(widgetRow?.requests ?? 0);
  const testTokens = Number(row?.tokens ?? 0);
  const widgetTokens = Number(widgetRow?.tokens ?? 0);
  const map = new Map<string, { requests: number; tokens: number }>();
  for (const item of trend) {
    map.set(String(item._id), {
      requests: Number(item.requests ?? 0),
      tokens: Number(item.tokens ?? 0),
    });
  }
  for (const item of widgetTrend) {
    const key = String(item._id);
    const prior = map.get(key) ?? { requests: 0, tokens: 0 };
    map.set(key, {
      requests: prior.requests + Number(item.requests ?? 0),
      tokens: prior.tokens + Number(item.tokens ?? 0),
    });
  }
  return {
    days,
    suspended,
    trials,
    activeSubscriptions,
    requests: testRequests + widgetRequests,
    testRequests,
    widgetRequests,
    tokens: testTokens + widgetTokens,
    testTokens,
    widgetTokens,
    errors: Number(row?.errors ?? 0),
    pending: Number(row?.pending ?? 0),
    costMicroUsd: row?.requests > 0 && row.priced === row.requests ? Number(row.costs) : null,
    openSupport,
    incidents,
    untracked,
    trend: Array.from({ length: days }, (_, index) => {
      const day = new Date(from.getTime() + index * 86400000).toISOString().slice(0, 10);
      return {
        date: day,
        requests: map.get(day)?.requests ?? 0,
        tokens: map.get(day)?.tokens ?? 0,
      };
    }),
    models: models.map((model) => ({
      model: String(model.model),
      enabled: model.enabled === true,
      inputUsdPerMillion: Number(model.inputMicroUsdPerMillion) / 1000000,
      outputUsdPerMillion: Number(model.outputMicroUsdPerMillion) / 1000000,
    })),
  };
}
export async function getSystemHealth() {
  await requirePlatformOperator();
  const db = authClient().db(getEnv().MONGODB_DB);
  let database = false;
  try {
    await db.command({ ping: 1 }, { timeoutMS: 3000 });
    database = true;
  } catch {
    /* Sanitized health DTO only. */
  }
  const settings = await getPlatformSettings();
  return {
    application: 'Responding',
    database: database ? 'Connected' : 'Unavailable',
    provider:
      process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL
        ? 'Configured; live connectivity not probed'
        : 'Not configured',
    jobs: 'In-app follow-up jobs available; no always-on worker process',
    integrations: 'No external delivery/calendar/payment integrations configured',
    supportEnabled: settings.supportEnabled,
    checkedAt: new Date().toISOString(),
  };
}
