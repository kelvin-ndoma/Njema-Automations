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
import { Appointment } from '@/modules/appointments/models';
import { ensureDefaultPipeline } from '@/modules/crm/repository';
import {
  cancelAppointmentRequest,
  confirmAppointmentRequest,
  getAppointmentsPage,
  requestAppointment,
} from '@/modules/appointments/service';

const state = vi.hoisted(() => ({ id: 'appt-owner' }));
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
  process.env.MONGODB_DB = 'appointments-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'appointments-test-secret-over-32-characters-long';
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
    Appointment.createIndexes(),
  ]);
  await createWorkspace(state.id, {
    name: 'Appt Business',
    slug: 'appt-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
  const org = await Organization.findOne({ slug: 'appt-business' });
  const pipeline = await ensureDefaultPipeline(String(org!._id));
  const [contact] = await Contact.create([
    {
      organizationId: org!._id,
      name: 'Appt Contact',
      email: 'appt@contact.example',
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
      title: 'Appt opportunity',
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

it('requests, confirms, and cancels appointments without calendar sync', async () => {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const created = await requestAppointment('appt-business', {
    opportunityId,
    title: 'Discovery call',
    requestedStartAt: start,
    durationMinutes: 30,
    notes: 'Discuss consultation scope',
  });
  const page = await getAppointmentsPage('appt-business');
  expect(page.appointments[0]?.id).toBe(created.id);
  expect(page.appointments[0]?.status).toBe('requested');
  await confirmAppointmentRequest('appt-business', { appointmentId: created.id });
  const confirmed = await getAppointmentsPage('appt-business');
  expect(confirmed.appointments[0]?.status).toBe('confirmed');
  await cancelAppointmentRequest('appt-business', { appointmentId: created.id });
  const cancelled = await getAppointmentsPage('appt-business');
  expect(cancelled.appointments[0]?.status).toBe('cancelled');
});
