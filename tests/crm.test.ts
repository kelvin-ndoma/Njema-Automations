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
import { Contact, Opportunity, Pipeline, Activity } from '@/modules/crm/models';
import { getCrmContacts, getCrmPipeline, updateOpportunityStage } from '@/modules/crm/service';
import { getWidgetSettings, saveWidgetSettings } from '@/modules/widget/service';
import {
  askVisitorQuestion,
  publicStartSession,
  submitVisitorLead,
} from '@/modules/widget/public-service';

const state = vi.hoisted(() => ({ id: 'crm-owner' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => {
    if (!state.id) throw new Error('SIGN_IN_REQUIRED');
    return { id: state.id };
  },
}));

let replica: MongoMemoryReplSet | undefined;
let publicKey = '';
const origin = 'https://crm.example';

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'crm-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'crm-test-secret-over-32-characters-long';
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
    Contact.createIndexes(),
    Pipeline.createIndexes(),
    Opportunity.createIndexes(),
    Activity.createIndexes(),
  ]);
  await createWorkspace(state.id, {
    name: 'CRM Business',
    slug: 'crm-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  await saveEmployeeConfiguration('crm-business', {
    name: 'CRM assistant',
    instructions: 'Ask what the visitor needs.',
    knowledge: 'Consultations are available Monday to Friday.',
    fallback: 'Please contact our team for that information.',
    goal: 'Qualify consultation interest and collect contact details when ready.',
    qualificationCriteria: 'Confirm service need and preferred timing.',
    escalationRules: 'Escalate when the visitor asks for a human.',
    allowedActions: ['continue', 'request_contact', 'escalate_human', 'record_qualification'],
    revision: 0,
  });
  await saveWidgetSettings('crm-business', {
    enabled: true,
    allowedOrigins: origin,
    revision: 0,
  });
  publicKey = (await getWidgetSettings('crm-business')).settings!.publicKey;
});

afterAll(async () => {
  delete process.env.RELAY_SYNTHETIC_AI;
  await mongoose.disconnect();
  await replica?.stop();
});

it('creates contact and opportunity from consented website lead and allows stage moves', async () => {
  const session = await publicStartSession(publicKey, origin);
  await askVisitorQuestion(session.token, origin, {
    message: 'When are consultations available?',
    requestId: randomUUID(),
  });
  await submitVisitorLead(session.token, origin, {
    name: 'Casey Lead',
    email: 'casey@lead.example',
    consent: true,
    requestId: randomUUID(),
  });
  const contacts = await getCrmContacts('crm-business');
  expect(contacts.contacts[0]?.email).toBe('casey@lead.example');
  expect(contacts.contacts[0]?.source).toBe('website_widget');
  expect(contacts.contacts[0]?.opportunities.length).toBeGreaterThan(0);
  expect(contacts.pipeline.stages.some((stage) => stage.key === 'new' && stage.count >= 1)).toBe(
    true,
  );
  expect(contacts.recentActivity.length).toBeGreaterThan(0);
  expect(contacts.totals.opportunities).toBeGreaterThan(0);
  const pipeline = await getCrmPipeline('crm-business');
  expect(pipeline.opportunities[0]?.stageKey).toBe('new');
  expect(pipeline.opportunities[0]?.contactEmail).toBe('casey@lead.example');
  expect(pipeline.stages.find((stage) => stage.key === 'new')?.opportunities.length).toBe(1);
  await updateOpportunityStage('crm-business', {
    opportunityId: pipeline.opportunities[0]!.id,
    stageKey: 'qualified',
  });
  const moved = await getCrmPipeline('crm-business');
  expect(moved.opportunities[0]?.stageKey).toBe('qualified');
  expect(moved.opportunities[0]?.status).toBe('open');
  expect(moved.stages.find((stage) => stage.key === 'qualified')?.opportunities.length).toBe(1);
  expect(moved.stages.find((stage) => stage.key === 'new')?.opportunities.length).toBe(0);
});
