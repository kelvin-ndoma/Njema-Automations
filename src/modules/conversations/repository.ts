import 'server-only';
import { connectDb } from '@/server/db';
import { Membership, AuditEvent } from '@/modules/organizations/models';
import { authorizeMembership } from '@/modules/organizations/policy';
import { DailyAIUsage, TestConversationRecord } from './models';
import { ConversationUnavailable, UsageExceeded, type TestConversation } from './input';
import { assertTenantState } from '@/server/access-state';
import { resolveAIAllowance } from '@/modules/platform/ai-allowance';

export const dailyRequestLimit = 20;
export const dailyTokenLimit = 100000;
async function authorize(organizationId: string, userId: string) {
  await connectDb();
  await assertTenantState(organizationId, userId, 'organization:update');
  authorizeMembership(
    await Membership.findOne({ organizationId, userId }).exec(),
    userId,
    'organization:update',
  );
}
export async function recentTests(
  organizationId: string,
  userId: string,
): Promise<TestConversation[]> {
  await authorize(organizationId, userId);
  const rows = await TestConversationRecord.find({ organizationId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(10)
    .lean()
    .exec();
  return rows.map((row) => ({
    id: String(row._id),
    question: row.question,
    answer: row.answer ?? null,
    status: row.status as TestConversation['status'],
    grounded: row.grounded,
    createdAt: row.createdAt.toISOString(),
  }));
}
export async function reserveTest(
  organizationId: string,
  userId: string,
  input: {
    question: string;
    requestId: string;
    reservedTokens: number;
    model: string;
    employeeRevision: number;
  },
) {
  await authorize(organizationId, userId);
  const day = new Date().toISOString().slice(0, 10);
  const row = await TestConversationRecord.db.transaction(async (session) => {
    const allowance = await resolveAIAllowance(organizationId, userId, input.model, session);
    const reservedCost =
      allowance.inputRate === null || allowance.outputRate === null
        ? null
        : Math.ceil(
            (input.reservedTokens * Math.max(allowance.inputRate, allowance.outputRate)) / 1000000,
          );
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    if (
      await TestConversationRecord.exists({ organizationId, requestId: input.requestId }).session(
        session,
      )
    )
      throw new ConversationUnavailable(
        'This question was already submitted. Reload to see the result.',
      );
    await DailyAIUsage.updateOne(
      { organizationId, day },
      { $setOnInsert: { requests: 0, committedTokens: 0, committedCostMicroUsd: 0 } },
      { upsert: true, session },
    );
    const budget = await DailyAIUsage.updateOne(
      {
        organizationId,
        day,
        requests: { $lt: allowance.requests },
        committedTokens: { $lte: allowance.tokens - input.reservedTokens },
        ...(allowance.costLimitMicroUsd !== null
          ? { committedCostMicroUsd: { $lte: allowance.costLimitMicroUsd - (reservedCost ?? 0) } }
          : {}),
      },
      {
        $inc: {
          requests: 1,
          committedTokens: input.reservedTokens,
          committedCostMicroUsd: reservedCost ?? 0,
        },
      },
      { session },
    );
    if (budget.modifiedCount !== 1) throw new UsageExceeded();
    const [conversation] = await TestConversationRecord.create(
      [
        {
          organizationId,
          actorId: userId,
          ...input,
          day,
          status: 'pending',
          reservedCostMicroUsd: reservedCost,
          inputRate: allowance.inputRate,
          outputRate: allowance.outputRate,
        },
      ],
      { session },
    );
    return { id: String(conversation._id), day };
  });
  return row;
}
export async function completeTest(
  organizationId: string,
  userId: string,
  id: string,
  reply: {
    answer: string;
    grounded: boolean;
    inputTokens: number;
    outputTokens: number;
  },
) {
  await authorize(organizationId, userId);
  await TestConversationRecord.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const row = await TestConversationRecord.findOneAndUpdate(
      { _id: id, organizationId, actorId: userId, status: 'pending' },
      { $set: { ...reply, status: 'completed' } },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new ConversationUnavailable();
    await resolveAIAllowance(organizationId, userId, row.model, session);
    const cost =
      typeof row.inputRate === 'number' && typeof row.outputRate === 'number'
        ? Math.ceil(
            (reply.inputTokens * row.inputRate + reply.outputTokens * row.outputRate) / 1000000,
          )
        : null;
    await TestConversationRecord.updateOne(
      { _id: row._id, organizationId },
      { $set: { costMicroUsd: cost } },
      { session },
    );
    // Do not release more than reserved or refund requests; failed/unknown calls stay charged.
    const refund = Math.max(0, row.reservedTokens - reply.inputTokens - reply.outputTokens);
    await DailyAIUsage.updateOne(
      { organizationId, day: row.day },
      {
        $inc: {
          committedTokens: -refund,
          committedCostMicroUsd: -Math.max(0, (row.reservedCostMicroUsd ?? 0) - (cost ?? 0)),
        },
      },
      { session },
    );
    await AuditEvent.create(
      [{ organizationId, actorId: userId, action: 'employee.test.completed', resourceId: id }],
      { session },
    );
  });
}
export async function failTest(organizationId: string, userId: string, id: string) {
  // If access was revoked, leave the reservation pending instead of mutating tenant data.
  await authorize(organizationId, userId);
  await TestConversationRecord.updateOne(
    { _id: id, organizationId, actorId: userId, status: 'pending' },
    { $set: { status: 'failed' } },
  );
}
