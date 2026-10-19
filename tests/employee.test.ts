import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import {
  createWorkspace,
  saveBusinessSettings,
  workspaceFor,
} from '@/modules/organizations/service';
import {
  Organization,
  Membership,
  AuditEvent,
  MutationLimit,
} from '@/modules/organizations/models';
import { SalesEmployee } from '@/modules/employees/models';
import { getEmployeeConfiguration, saveEmployeeConfiguration } from '@/modules/employees/service';
import {
  readConfiguration,
  setEmployeeStatus,
  writeConfiguration,
} from '@/modules/employees/repository';
import { employeeInput, type SalesAgentAction } from '@/modules/employees/input';

const state = vi.hoisted(() => ({ id: 'owner-a' }));
vi.mock('@/server/session', () => ({
  requireUser: async () => {
    if (!state.id) throw new Error('SIGN_IN_REQUIRED');
    return { id: state.id };
  },
}));
let replica: MongoMemoryReplSet | undefined;
let organizationId: string;
const profile = { name: 'Example Business', currency: 'USD', locale: 'en-US', timeZone: 'UTC' };
const configuration = {
  name: 'Sales assistant',
  instructions: 'Ask about the visitor needs before recommending a service.',
  knowledge: 'We offer business consultations Monday through Friday, from 9am to 5pm.',
  fallback: 'I do not have that information. Please contact our team.',
  goal: 'Qualify consultation interest and collect contact details when ready.',
  qualificationCriteria: 'Confirm service need, preferred timing, and contact preference.',
  escalationRules: 'Escalate when the visitor asks for a human or makes a complaint.',
  allowedActions: [
    'continue',
    'request_contact',
    'escalate_human',
    'record_qualification',
  ] as SalesAgentAction[],
  revision: 0,
};
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'employee-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'employee-test-only-secret-over-32-characters';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    SalesEmployee.createIndexes(),
  ]);
  await createWorkspace(state.id, { ...profile, slug: 'business-a' });
  await createWorkspace('owner-b', { ...profile, slug: 'business-b' });
  organizationId = (await workspaceFor(state.id, 'business-a')).id;
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});

it('requires authentication and returns an honest empty configuration', async () => {
  state.id = '';
  await expect(getEmployeeConfiguration('business-a')).rejects.toThrow('SIGN_IN_REQUIRED');
  await expect(saveEmployeeConfiguration('business-a', configuration)).rejects.toThrow(
    'SIGN_IN_REQUIRED',
  );
  state.id = 'owner-a';
  expect((await getEmployeeConfiguration('business-a')).employee).toBeNull();
});
it('saves approved knowledge and ignores injected tenant/role claims', async () => {
  await saveEmployeeConfiguration('business-a', {
    ...configuration,
    organizationId: 'foreign',
    role: 'owner',
  });
  const employee = (await getEmployeeConfiguration('business-a')).employee;
  expect(employee?.knowledge).toBe(configuration.knowledge);
  expect(employee?.revision).toBe(1);
  expect(employee).not.toHaveProperty('organizationId');
  const audit = await AuditEvent.findOne({ organizationId, action: 'employee.configured' }).lean();
  expect(audit).toBeTruthy();
  expect(audit).not.toHaveProperty('knowledge');
});
it('denies foreign-tenant service and direct repository access', async () => {
  await expect(getEmployeeConfiguration('business-b')).rejects.toThrow('access denied');
  await expect(saveEmployeeConfiguration('business-b', configuration)).rejects.toThrow(
    'access denied',
  );
  const other = await Organization.findOne({ slug: 'business-b' });
  await expect(readConfiguration(String(other!._id), state.id)).rejects.toThrow('access denied');
  await expect(writeConfiguration(String(other!._id), state.id, configuration)).rejects.toThrow(
    'access denied',
  );
});
it('rejects stale revisions, including repeated initial creation', async () => {
  await expect(saveEmployeeConfiguration('business-a', configuration)).rejects.toThrow('Reload');
  await saveEmployeeConfiguration('business-a', {
    ...configuration,
    revision: 1,
    name: 'Updated employee',
  });
  await expect(
    saveEmployeeConfiguration('business-a', { ...configuration, revision: 1 }),
  ).rejects.toThrow('Reload');
  expect((await getEmployeeConfiguration('business-a')).employee?.name).toBe('Updated employee');
});
it('rolls back configuration changes when audit insertion fails', async () => {
  const spy = vi
    .spyOn(AuditEvent, 'create')
    .mockRejectedValueOnce(new Error('synthetic audit failure'));
  try {
    await expect(
      saveEmployeeConfiguration('business-a', { ...configuration, revision: 2 }),
    ).rejects.toThrow('synthetic audit failure');
  } finally {
    spy.mockRestore();
  }
  expect((await getEmployeeConfiguration('business-a')).employee?.revision).toBe(2);
});
it('bounds knowledge and rejects invalid configurations before writes', async () => {
  expect(employeeInput.safeParse({ ...configuration, knowledge: 'x'.repeat(20001) }).success).toBe(
    false,
  );
  await expect(
    saveEmployeeConfiguration('business-a', { ...configuration, revision: 2, name: '' }),
  ).rejects.toThrow();
  expect((await getEmployeeConfiguration('business-a')).employee?.revision).toBe(2);
});
it('allows active viewers to read but denies configuration/settings writes', async () => {
  await Membership.updateOne({ organizationId, userId: state.id }, { role: 'viewer' });
  expect((await getEmployeeConfiguration('business-a')).employee?.revision).toBe(2);
  await expect(
    saveEmployeeConfiguration('business-a', { ...configuration, revision: 2 }),
  ).rejects.toThrow('access denied');
  await expect(
    writeConfiguration(organizationId, state.id, { ...configuration, revision: 2 }),
  ).rejects.toThrow('access denied');
  await expect(saveBusinessSettings(state.id, 'business-a', profile)).rejects.toThrow(
    'access denied',
  );
});
it('allows organization admins to update settings without changing immutable slug', async () => {
  await Membership.updateOne({ organizationId, userId: state.id }, { role: 'admin' });
  await saveBusinessSettings(state.id, 'business-a', {
    ...profile,
    name: 'Updated Business',
    slug: 'injected',
    currency: 'EUR',
  });
  const workspace = await workspaceFor(state.id, 'business-a');
  expect(workspace.name).toBe('Updated Business');
  expect(workspace.currency).toBe('EUR');
  expect(workspace.slug).toBe('business-a');
  await saveEmployeeConfiguration('business-a', {
    ...configuration,
    revision: 2,
    name: 'Admin configured employee',
  });
  expect((await getEmployeeConfiguration('business-a')).employee?.revision).toBe(3);
  expect(
    await AuditEvent.countDocuments({ organizationId, action: 'organization.settings.updated' }),
  ).toBe(1);
});
it('rolls back business settings if audit insertion fails', async () => {
  const spy = vi
    .spyOn(AuditEvent, 'create')
    .mockRejectedValueOnce(new Error('synthetic audit failure'));
  try {
    await expect(saveBusinessSettings(state.id, 'business-a', profile)).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect((await workspaceFor(state.id, 'business-a')).name).toBe('Updated Business');
});
it('pauses and resumes the sales employee with revision safety', async () => {
  const before = (await getEmployeeConfiguration('business-a')).employee!;
  expect(before.status).toBe('active');
  const paused = await setEmployeeStatus(organizationId, state.id, 'paused', before.revision);
  expect(paused.status).toBe('paused');
  const resumed = await setEmployeeStatus(organizationId, state.id, 'active', paused.revision);
  expect(resumed.status).toBe('active');
  expect(
    await AuditEvent.countDocuments({
      organizationId,
      action: { $in: ['employee.paused', 'employee.resumed'] },
    }),
  ).toBeGreaterThanOrEqual(2);
});

it('denies revoked memberships on reads and writes immediately', async () => {
  await Membership.updateOne({ organizationId, userId: state.id }, { status: 'revoked' });
  await expect(getEmployeeConfiguration('business-a')).rejects.toThrow('access denied');
  await expect(readConfiguration(organizationId, state.id)).rejects.toThrow('access denied');
  await expect(writeConfiguration(organizationId, state.id, configuration)).rejects.toThrow(
    'access denied',
  );
  await expect(saveBusinessSettings(state.id, 'business-a', profile)).rejects.toThrow(
    'access denied',
  );
});
