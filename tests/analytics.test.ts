import { afterAll, beforeAll, expect, it, vi } from 'vitest';
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
import { Contact, Opportunity, Pipeline, Activity } from '@/modules/crm/models';
import { Quotation } from '@/modules/quotations/models';
import { Appointment } from '@/modules/appointments/models';
import { FollowUpJob } from '@/modules/jobs/models';
import { QualifiedLead, VisitorConversation } from '@/modules/widget/models';
import { getWorkspaceAnalytics } from '@/modules/analytics/service';
import { ensureDefaultPipeline } from '@/modules/crm/repository';

const state = vi.hoisted(() => ({ id: 'analytics-owner' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => ({ id: state.id }),
}));

let replica: MongoMemoryReplSet | undefined;

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'analytics-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'analytics-test-secret-over-32-characters-long';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    Contact.createIndexes(),
    Pipeline.createIndexes(),
    Opportunity.createIndexes(),
    Activity.createIndexes(),
    Quotation.createIndexes(),
    Appointment.createIndexes(),
    FollowUpJob.createIndexes(),
    QualifiedLead.createIndexes(),
    VisitorConversation.createIndexes(),
  ]);
  await createWorkspace(state.id, {
    name: 'Analytics Business',
    slug: 'analytics-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  const org = await Organization.findOne({ slug: 'analytics-business' });
  const pipeline = await ensureDefaultPipeline(String(org!._id));
  const [contact] = await Contact.create([
    {
      organizationId: org!._id,
      name: 'Analytics Contact',
      email: 'analytics@contact.example',
      source: 'manual',
    },
  ]);
  await Opportunity.create([
    {
      organizationId: org!._id,
      contactId: contact._id,
      pipelineId: pipeline._id,
      stageKey: 'qualified',
      title: 'Open deal',
      ownerId: state.id,
      status: 'open',
    },
    {
      organizationId: org!._id,
      contactId: contact._id,
      pipelineId: pipeline._id,
      stageKey: 'won',
      title: 'Won deal',
      ownerId: state.id,
      status: 'won',
    },
  ]);
  await Quotation.create([
    {
      organizationId: org!._id,
      opportunityId: (await Opportunity.findOne({ title: 'Open deal' }))!._id,
      contactId: contact._id,
      currency: 'USD',
      status: 'draft',
      title: 'Draft quote',
      lines: [{ description: 'Item', quantity: 1, unitAmountMinor: 1000 }],
      createdBy: state.id,
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});

it('reports real persisted counts without inventing revenue', async () => {
  const page = await getWorkspaceAnalytics('analytics-business');
  expect(page.metrics.contactCount).toBe(1);
  expect(page.metrics.openOpportunities).toBe(1);
  expect(page.metrics.wonOpportunities).toBe(1);
  expect(page.metrics.draftQuotations).toBe(1);
  expect(page.metrics.approvedQuotations).toBe(0);
  expect(page.metrics.conversationCount).toBe(0);
});
