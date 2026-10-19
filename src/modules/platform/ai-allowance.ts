import 'server-only';
import mongoose from 'mongoose';
import type { ClientSession } from 'mongodb';
import { defaultSettings } from './operations-input';
import { assertOrganizationOperational, assertTenantState } from '@/server/access-state';
import { ConversationUnavailable } from '@/modules/conversations/input';

async function resolvePolicyAllowance(
  organizationId: string,
  model: string,
  aiDisabled: boolean,
  session?: ClientSession,
) {
  const db = mongoose.connection.db!;
  const settings = await db
    .collection('platformSettings')
    .findOne({ _id: 'platform' as never }, { session });
  const subscription = await db
    .collection('organizationSubscriptions')
    .findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) }, { session });
  const policy = await db.collection('modelPolicies').findOne({ model }, { session });
  if (
    aiDisabled ||
    settings?.aiEnabled === false ||
    policy?.enabled === false ||
    (settings && Array.isArray(settings.models) && !settings.models.includes(model))
  )
    throw new ConversationUnavailable('AI execution is disabled by an administrative policy.');
  let requests = Number(settings?.dailyRequests ?? defaultSettings.dailyRequests);
  let tokens = Number(settings?.dailyTokens ?? defaultSettings.dailyTokens);
  if (subscription) {
    if (
      !['active', 'trial'].includes(subscription.state) ||
      (subscription.state === 'trial' &&
        (!(subscription.trialEndsAt instanceof Date) || subscription.trialEndsAt <= new Date()))
    )
      throw new ConversationUnavailable('The subscription does not currently allow AI execution.');
    const plan = await db
      .collection('subscriptionPlans')
      .findOne({ _id: subscription.planId }, { session });
    if (!plan || !plan.aiEnabled)
      throw new ConversationUnavailable('The assigned plan does not include AI execution.');
    requests = Math.min(requests, Number(plan.dailyRequests));
    tokens = Math.min(tokens, Number(plan.dailyTokens));
  }
  const costLimit =
    typeof settings?.dailyCostUsd === 'number' ? Math.floor(settings.dailyCostUsd * 1000000) : null;
  if (costLimit !== null && !policy)
    throw new ConversationUnavailable(
      'A model rate policy is required to enforce the configured cost ceiling.',
    );
  return {
    requests,
    tokens,
    costLimitMicroUsd: costLimit,
    inputRate: policy ? Number(policy.inputMicroUsdPerMillion) : null,
    outputRate: policy ? Number(policy.outputMicroUsdPerMillion) : null,
  };
}

export async function resolveAIAllowance(
  organizationId: string,
  userId: string,
  model: string,
  session?: ClientSession,
) {
  const state = await assertTenantState(organizationId, userId, 'organization:update', session);
  return resolvePolicyAllowance(organizationId, model, state.aiDisabled, session);
}

/** Public widget path: organization lifecycle and plan policy only — no membership. */
export async function resolvePublicAIAllowance(
  organizationId: string,
  model: string,
  session?: ClientSession,
) {
  const state = await assertOrganizationOperational(organizationId, session);
  if (state.readOnly)
    throw new ConversationUnavailable('AI execution is disabled by an administrative policy.');
  return resolvePolicyAllowance(organizationId, model, state.aiDisabled, session);
}
