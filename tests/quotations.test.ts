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
import { ensureDefaultPipeline } from '@/modules/crm/repository';
import {
  approveQuotationDraft,
  createQuotationDraft,
  getQuotationsPage,
} from '@/modules/quotations/service';

const state = vi.hoisted(() => ({ id: 'quote-owner' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => ({ id: state.id }),
}));

let replica: MongoMemoryReplSet | undefined;
let opportunityId = '';

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'quotations-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'quotations-test-secret-over-32-characters-long';
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
  ]);
  await createWorkspace(state.id, {
    name: 'Quote Business',
    slug: 'quote-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  const org = await Organization.findOne({ slug: 'quote-business' });
  const pipeline = await ensureDefaultPipeline(String(org!._id));
  const [contact] = await Contact.create([
    {
      organizationId: org!._id,
      name: 'Quote Contact',
      email: 'quote@contact.example',
      source: 'manual',
      ownerId: state.id,
    },
  ]);
  const [opportunity] = await Opportunity.create([
    {
      organizationId: org!._id,
      contactId: contact._id,
      pipelineId: pipeline._id,
      stageKey: 'qualified',
      title: 'Quote opportunity',
      ownerId: state.id,
      status: 'open',
    },
  ]);
  opportunityId = String(opportunity._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});

it('creates a draft quotation on an open opportunity and requires approval', async () => {
  const created = await createQuotationDraft('quote-business', {
    opportunityId,
    title: 'Starter consultation',
    description: 'One consultation session',
    quantity: 1,
    unitAmount: 150,
    notes: 'Valid for 14 days',
  });
  const page = await getQuotationsPage('quote-business');
  expect(page.quotations[0]?.id).toBe(created.id);
  expect(page.quotations[0]?.status).toBe('draft');
  expect(page.quotations[0]?.totalLabel).toContain('150');
  await approveQuotationDraft('quote-business', { quotationId: created.id });
  const approved = await getQuotationsPage('quote-business');
  expect(approved.quotations[0]?.status).toBe('approved');
});
