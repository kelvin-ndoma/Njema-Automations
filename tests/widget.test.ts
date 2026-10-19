import { afterAll, beforeAll, expect, it, vi } from 'vitest';
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
import { DailyAIUsage } from '@/modules/conversations/models';
import {
  QualifiedLead,
  VisitorConversation,
  VisitorRequest,
  VisitorSession,
  WidgetInstallation,
} from '@/modules/widget/models';
import {
  getInbox,
  getInboxConversation,
  getWidgetSettings,
  resumeInboxAi,
  saveWidgetSettings,
  sendHumanInboxReply,
  takeOverInboxConversation,
} from '@/modules/widget/service';
import {
  askVisitorQuestion,
  publicBootstrap,
  publicStartSession,
  submitVisitorLead,
} from '@/modules/widget/public-service';
import { AccessDenied } from '@/modules/organizations/policy';
import { VisitorDenied, WidgetUnavailable } from '@/modules/widget/input';

const state = vi.hoisted(() => ({ id: 'widget-owner' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => {
    if (!state.id) throw new Error('SIGN_IN_REQUIRED');
    return { id: state.id };
  },
}));

let replica: MongoMemoryReplSet | undefined;
let publicKey = '';
const origin = 'https://shop.example';
const foreign = 'https://evil.example';

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'widget-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'widget-test-secret-over-32-characters-long';
  process.env.RELAY_SYNTHETIC_AI = '1';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    SalesEmployee.createIndexes(),
    DailyAIUsage.createIndexes(),
    WidgetInstallation.createIndexes(),
    VisitorSession.createIndexes(),
    VisitorConversation.createIndexes(),
    VisitorRequest.createIndexes(),
    QualifiedLead.createIndexes(),
  ]);
  await createWorkspace(state.id, {
    name: 'Widget Business',
    slug: 'widget-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  await createWorkspace('other-owner', {
    name: 'Other Widget',
    slug: 'other-widget',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  await saveEmployeeConfiguration('widget-business', {
    name: 'Site assistant',
    instructions: 'Ask what the visitor needs.',
    knowledge: 'Consultations are available Monday to Friday.',
    fallback: 'Please contact our team for that information.',
    goal: 'Qualify consultation interest and collect contact details when ready.',
    qualificationCriteria: 'Confirm service need and preferred timing.',
    escalationRules: 'Escalate when the visitor asks for a human.',
    allowedActions: ['continue', 'request_contact', 'escalate_human', 'record_qualification'],
    revision: 0,
  });
  await saveWidgetSettings('widget-business', {
    enabled: true,
    allowedOrigins: origin,
    revision: 0,
  });
  publicKey = (await getWidgetSettings('widget-business')).settings!.publicKey;
});

afterAll(async () => {
  delete process.env.RELAY_SYNTHETIC_AI;
  await mongoose.disconnect();
  await replica?.stop();
});

it('rejects foreign origins and foreign tenant inbox access', async () => {
  await expect(publicBootstrap(publicKey, foreign)).rejects.toBeInstanceOf(VisitorDenied);
  await expect(publicStartSession(publicKey, foreign)).rejects.toBeInstanceOf(VisitorDenied);
  state.id = 'other-owner';
  await expect(getInbox('widget-business')).rejects.toBeInstanceOf(AccessDenied);
  state.id = 'widget-owner';
});

it('runs visitor reply, consented lead capture and authorized inbox listing', async () => {
  const session = await publicStartSession(publicKey, origin);
  const reply = await askVisitorQuestion(session.token, origin, {
    message: 'When are consultations available?',
    requestId: randomUUID(),
  });
  expect(reply.answer).toContain('approved information');
  await submitVisitorLead(session.token, origin, {
    name: 'Alex Visitor',
    email: 'alex@visitor.example',
    phone: '+15550100',
    consent: true,
    requestId: randomUUID(),
  });
  await expect(
    submitVisitorLead(session.token, foreign, {
      name: 'Alex Visitor',
      email: 'alex@visitor.example',
      consent: true,
      requestId: randomUUID(),
    }),
  ).rejects.toBeInstanceOf(VisitorDenied);
  const inbox = await getInbox('widget-business');
  expect(inbox.leads[0]?.email).toBe('alex@visitor.example');
  expect(inbox.leads[0]?.latestVisitorMessage).toContain('consultations');
  expect(inbox.conversations[0]?.hasLead).toBe(true);
  expect(await DailyAIUsage.countDocuments({ organizationId: inbox.workspace.id })).toBe(1);
});

it('blocks duplicate message submissions from consuming a second budget unit', async () => {
  const session = await publicStartSession(publicKey, origin);
  const requestId = randomUUID();
  await askVisitorQuestion(session.token, origin, {
    message: 'Do you offer weekday help?',
    requestId,
  });
  const before = await DailyAIUsage.findOne({
    organizationId: (await getInbox('widget-business')).workspace.id,
  }).lean();
  await expect(
    askVisitorQuestion(session.token, origin, {
      message: 'Do you offer weekday help?',
      requestId,
    }),
  ).rejects.toThrow('already submitted');
  const after = await DailyAIUsage.findOne({
    organizationId: (await getInbox('widget-business')).workspace.id,
  }).lean();
  expect(after?.requests).toBe(before?.requests);
});

it('supports multi-turn history, human takeover that blocks AI, and human replies', async () => {
  process.env.RELAY_SYNTHETIC_AI = '1';
  const session = await publicStartSession(publicKey, origin);
  await askVisitorQuestion(session.token, origin, {
    message: 'When are consultations available?',
    requestId: randomUUID(),
  });
  await askVisitorQuestion(session.token, origin, {
    message: 'Please email me about weekday help.',
    requestId: randomUUID(),
  });
  const inbox = await getInbox('widget-business');
  const conversationId = inbox.conversations[0]?.id;
  expect(conversationId).toBeTruthy();
  await takeOverInboxConversation('widget-business', conversationId!);
  await expect(
    askVisitorQuestion(session.token, origin, {
      message: 'Are you still there?',
      requestId: randomUUID(),
    }),
  ).rejects.toBeInstanceOf(WidgetUnavailable);
  await sendHumanInboxReply('widget-business', conversationId!, {
    content: 'Thanks — a consultant will follow up shortly.',
  });
  const detail = await getInboxConversation('widget-business', conversationId!);
  expect(detail.conversation?.controlMode).toBe('human');
  expect(detail.conversation?.messages.some((message) => message.role === 'human')).toBe(true);
  await resumeInboxAi('widget-business', conversationId!);
  const resumed = await getInboxConversation('widget-business', conversationId!);
  expect(resumed.conversation?.controlMode).toBe('ai');
  delete process.env.RELAY_SYNTHETIC_AI;
});
