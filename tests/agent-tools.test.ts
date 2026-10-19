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
import { FollowUpJob } from '@/modules/jobs/models';
import { Quotation } from '@/modules/quotations/models';
import { Appointment } from '@/modules/appointments/models';
import { getCrmPipeline } from '@/modules/crm/service';
import { getFollowUps, runDueFollowUps } from '@/modules/jobs/service';
import { getQuotationsPage } from '@/modules/quotations/service';
import { getAppointmentsPage } from '@/modules/appointments/service';
import { getWidgetSettings, saveWidgetSettings } from '@/modules/widget/service';
import {
  askVisitorQuestion,
  publicStartSession,
  submitVisitorLead,
} from '@/modules/widget/public-service';

const state = vi.hoisted(() => ({ id: 'agent-owner' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => ({ id: state.id }),
}));

let replica: MongoMemoryReplSet | undefined;
let publicKey = '';
const origin = 'https://agent.example';

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'agent-tools-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'agent-tools-test-secret-over-32-characters';
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
    FollowUpJob.createIndexes(),
    Quotation.createIndexes(),
    Appointment.createIndexes(),
  ]);
  await createWorkspace(state.id, {
    name: 'Agent Business',
    slug: 'agent-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  await saveEmployeeConfiguration('agent-business', {
    name: 'Agent',
    instructions: 'Qualify and follow up.',
    knowledge: 'Consultations are available Monday to Friday.',
    fallback: 'Please contact our team for that information.',
    goal: 'Qualify and schedule follow-up when consented.',
    qualificationCriteria: 'Confirm need and timing.',
    escalationRules: 'Escalate for complaints.',
    allowedActions: [
      'continue',
      'request_contact',
      'escalate_human',
      'record_qualification',
      'advance_opportunity',
      'schedule_follow_up',
      'request_quotation',
      'request_appointment',
    ],
    revision: 0,
  });
  await saveWidgetSettings('agent-business', {
    enabled: true,
    allowedOrigins: origin,
    revision: 0,
  });
  publicKey = (await getWidgetSettings('agent-business')).settings!.publicKey;
});

afterAll(async () => {
  delete process.env.RELAY_SYNTHETIC_AI;
  await mongoose.disconnect();
  await replica?.stop();
});

it('writes CRM qualification and schedules a consent-aware follow-up from AI actions', async () => {
  const session = await publicStartSession(publicKey, origin);
  await askVisitorQuestion(session.token, origin, {
    message: 'When are consultations available?',
    requestId: randomUUID(),
  });
  await submitVisitorLead(session.token, origin, {
    name: 'Pat Prospect',
    email: 'pat@prospect.example',
    consent: true,
    requestId: randomUUID(),
  });
  await askVisitorQuestion(session.token, origin, {
    message: 'Please follow up with me tomorrow about weekday help.',
    requestId: randomUUID(),
  });
  const pipeline = await getCrmPipeline('agent-business');
  expect(pipeline.opportunities[0]?.contactEmail).toBe('pat@prospect.example');
  const followUps = await getFollowUps('agent-business');
  expect(followUps.followUps.length).toBeGreaterThan(0);
  expect(followUps.followUps[0]?.channel).toBe('in_app');
  expect(followUps.followUps[0]?.status).toBe('pending');
  await FollowUpJob.updateOne(
    { _id: followUps.followUps[0]!.id },
    { $set: { scheduledAt: new Date(Date.now() - 60_000) } },
  );
  const processed = await runDueFollowUps('agent-business');
  expect(processed.processed).toBe(1);
  const after = await getFollowUps('agent-business');
  expect(after.followUps[0]?.status).toBe('completed');
});

it('requests quotation drafts and provisional appointments without inventing prices or calendar invites', async () => {
  const session = await publicStartSession(publicKey, origin);
  await askVisitorQuestion(session.token, origin, {
    message: 'Tell me about consultations.',
    requestId: randomUUID(),
  });
  await submitVisitorLead(session.token, origin, {
    name: 'Quinn Buyer',
    email: 'quinn@buyer.example',
    consent: true,
    requestId: randomUUID(),
  });
  await askVisitorQuestion(session.token, origin, {
    message: 'Please send a quotation for a consultation proposal.',
    requestId: randomUUID(),
  });
  const quotes = await getQuotationsPage('agent-business');
  expect(quotes.quotations.some((row) => row.totalMinor === 0 && row.status === 'draft')).toBe(
    true,
  );
  await askVisitorQuestion(session.token, origin, {
    message: 'Can we book a call or schedule a meeting next week?',
    requestId: randomUUID(),
  });
  const appointments = await getAppointmentsPage('agent-business');
  expect(appointments.appointments.some((row) => row.status === 'requested')).toBe(true);
});
