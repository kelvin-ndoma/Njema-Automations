import { beforeAll, afterAll, afterEach, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { createWorkspace } from '@/modules/organizations/service';
import {
  Organization,
  Membership,
  AuditEvent,
  MutationLimit,
} from '@/modules/organizations/models';
import { SalesEmployee } from '@/modules/employees/models';
import { saveEmployeeConfiguration } from '@/modules/employees/service';
import { askTestQuestion, getTestChat } from '@/modules/conversations/service';
import { DailyAIUsage, TestConversationRecord } from '@/modules/conversations/models';
import { reserveTest, recentTests } from '@/modules/conversations/repository';

const state = vi.hoisted(() => ({ id: 'chat-owner' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => {
    if (!state.id) throw new Error('SIGN_IN_REQUIRED');
    return { id: state.id };
  },
}));
let replica: MongoMemoryReplSet | undefined;
let orgId: string;
const request = () => ({ question: 'When are consultations available?', requestId: randomUUID() });
function reply() {
  return Response.json({
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: JSON.stringify({
              answer: 'Consultations are available on weekdays.',
              evidence: ['Monday to Friday'],
            }),
          },
        ],
      },
    ],
    usage: { input_tokens: 100, output_tokens: 20 },
  });
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'conversation-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'conversation-test-secret-over-32-characters';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    SalesEmployee.createIndexes(),
    DailyAIUsage.createIndexes(),
    TestConversationRecord.createIndexes(),
  ]);
  const profile = { name: 'Chat Business', currency: 'USD', locale: 'en-US', timeZone: 'UTC' };
  await createWorkspace(state.id, { ...profile, slug: 'chat-business' });
  await createWorkspace('other-owner', { ...profile, slug: 'other-chat' });
  orgId = String((await Organization.findOne({ slug: 'chat-business' }))!._id);
  await saveEmployeeConfiguration('chat-business', {
    name: 'Test assistant',
    instructions: 'Ask what service is needed.',
    knowledge: 'Consultations are available Monday to Friday.',
    fallback: 'Please contact our team for that information.',
    goal: 'Qualify consultation interest and collect contact details when ready.',
    qualificationCriteria: 'Confirm service need and preferred timing.',
    escalationRules: 'Escalate when the visitor asks for a human.',
    allowedActions: ['continue', 'request_contact', 'escalate_human', 'record_qualification'],
    revision: 0,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});
function configure() {
  vi.stubEnv('OPENAI_API_KEY', 'synthetic-test-key');
  vi.stubEnv('OPENAI_MODEL', 'synthetic-model');
}
it('requires authentication and blocks missing configuration without reserving usage', async () => {
  state.id = '';
  await expect(getTestChat('chat-business')).rejects.toThrow('SIGN_IN_REQUIRED');
  state.id = 'chat-owner';
  vi.stubEnv('OPENAI_API_KEY', '');
  vi.stubEnv('OPENAI_MODEL', '');
  expect((await getTestChat('chat-business')).available).toBe(false);
  await expect(askTestQuestion('chat-business', request())).rejects.toThrow('OpenAI connection');
  expect(await DailyAIUsage.countDocuments()).toBe(0);
});
it('reserves usage and persists the real service path with a synthetic provider', async () => {
  configure();
  const fetcher = vi.fn(async () => reply());
  vi.stubGlobal('fetch', fetcher);
  await askTestQuestion('chat-business', request());
  const data = await getTestChat('chat-business');
  expect(data.conversations[0]).toMatchObject({
    status: 'completed',
    grounded: true,
    answer: 'Consultations are available on weekdays.',
  });
  expect(await DailyAIUsage.findOne({ organizationId: orgId }).lean()).toMatchObject({
    requests: 1,
    committedTokens: 120,
  });
  expect(
    await AuditEvent.countDocuments({ organizationId: orgId, action: 'employee.test.completed' }),
  ).toBe(1);
  expect(fetcher).toHaveBeenCalledOnce();
});
it('duplicate submissions cannot trigger duplicate provider calls', async () => {
  configure();
  const fetcher = vi.fn(async () => reply());
  vi.stubGlobal('fetch', fetcher);
  const input = request();
  await askTestQuestion('chat-business', input);
  await expect(askTestQuestion('chat-business', input)).rejects.toThrow('already submitted');
  expect(fetcher).toHaveBeenCalledOnce();
});
it('provider failure saves no answer and does not refund uncertain spending', async () => {
  configure();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 500 })),
  );
  const before = (await DailyAIUsage.findOne({ organizationId: orgId }))!.committedTokens;
  const input = request();
  await expect(askTestQuestion('chat-business', input)).rejects.toThrow('could not be completed');
  const row = await TestConversationRecord.findOne({
    organizationId: orgId,
    requestId: input.requestId,
  });
  expect(row?.status).toBe('failed');
  expect(row?.answer).toBeNull();
  expect((await DailyAIUsage.findOne({ organizationId: orgId }))!.committedTokens).toBeGreaterThan(
    before,
  );
});
it('foreign tenants and viewers cannot read tests or trigger provider execution', async () => {
  configure();
  const fetcher = vi.fn(async () => reply());
  vi.stubGlobal('fetch', fetcher);
  await expect(askTestQuestion('other-chat', request())).rejects.toThrow('access denied');
  const other = await Organization.findOne({ slug: 'other-chat' });
  await expect(recentTests(String(other!._id), state.id)).rejects.toThrow('access denied');
  await Membership.updateOne({ organizationId: orgId, userId: state.id }, { role: 'viewer' });
  await expect(askTestQuestion('chat-business', request())).rejects.toThrow('access denied');
  await expect(getTestChat('chat-business')).rejects.toThrow('access denied');
  expect(fetcher).not.toHaveBeenCalled();
  await Membership.updateOne({ organizationId: orgId, userId: state.id }, { role: 'owner' });
});
it('revocation during an external reply prevents publication and keeps the reservation charged', async () => {
  configure();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      await Membership.updateOne(
        { organizationId: orgId, userId: state.id },
        { status: 'revoked' },
      );
      return reply();
    }),
  );
  const input = request();
  await expect(askTestQuestion('chat-business', input)).rejects.toThrow('access denied');
  const row = await TestConversationRecord.findOne({
    organizationId: orgId,
    requestId: input.requestId,
  });
  expect(row?.status).toBe('pending');
  expect(row?.answer).toBeNull();
  await expect(getTestChat('chat-business')).rejects.toThrow('access denied');
  await Membership.updateOne({ organizationId: orgId, userId: state.id }, { status: 'active' });
});
it('concurrent reservations enforce the daily request ceiling atomically', async () => {
  const organizationId = String((await Organization.findOne({ slug: 'other-chat' }))!._id);
  const day = new Date().toISOString().slice(0, 10);
  await DailyAIUsage.create({ organizationId, day, requests: 0, committedTokens: 0 });
  const results = await Promise.allSettled(
    Array.from({ length: 25 }, () =>
      reserveTest(organizationId, 'other-owner', {
        ...request(),
        reservedTokens: 1000,
        model: 'synthetic-model',
        employeeRevision: 1,
      }),
    ),
  );
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(20);
  expect(await DailyAIUsage.findOne({ organizationId, day }).lean()).toMatchObject({
    requests: 20,
    committedTokens: 20000,
  });
  expect(await TestConversationRecord.countDocuments({ organizationId })).toBe(20);
});
it('token ceiling blocks a request without consuming the remaining request count', async () => {
  const organizationId = String((await Organization.findOne({ slug: 'other-chat' }))!._id);
  await DailyAIUsage.updateOne({ organizationId }, { requests: 1, committedTokens: 99999 });
  await expect(
    reserveTest(organizationId, 'other-owner', {
      ...request(),
      reservedTokens: 1000,
      model: 'synthetic-model',
      employeeRevision: 1,
    }),
  ).rejects.toThrow('daily chat allowance');
  expect((await DailyAIUsage.findOne({ organizationId }))?.requests).toBe(1);
});
