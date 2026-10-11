import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { submitDemoInquiry } from '@/modules/marketing/service';
import { demoInput } from '@/modules/marketing/validation';
let replica: MongoMemoryReplSet;
const sample = {
  name: 'Test Visitor',
  email: 'inquiry@example.test',
  business: 'Example Business',
  industry: 'services',
  message: 'Explore availability',
  consent: 'on',
  website: '',
};
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'demo-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'test-only-secret-at-least-32-characters';
  await connectDb();
});
beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});
it('persists the inquiry, consent and audit metadata atomically', async () => {
  await submitDemoInquiry(sample, 'test-request');
  const row = await mongoose.connection.db!.collection('demoinquiries').findOne();
  expect(row?.email).toBe(sample.email);
  expect(row?.consentAt).toBeInstanceOf(Date);
  expect(row?.status).toBe('new');
  expect(row).not.toHaveProperty('ip');
  const audit = await mongoose.connection.db!.collection('marketingaudits').findOne();
  expect(String(audit?.resourceId)).toBe(String(row?._id));
  expect(audit?.action).toBe('marketing.demo_inquiry.created');
  expect(audit).not.toHaveProperty('email');
});
it('rejects invalid inputs and honeypots before persistence', async () => {
  for (const patch of [
    { email: 'bad' },
    { name: '' },
    { business: '' },
    { industry: 'bad' },
    { consent: '' },
    { website: 'spam' },
    { message: 'x'.repeat(2001) },
  ]) {
    await expect(submitDemoInquiry({ ...sample, ...patch }, 'test')).rejects.toThrow();
  }
  expect(await mongoose.connection.db!.collection('demoinquiries').countDocuments()).toBe(0);
});
it('normalizes input and does not accept browser-provided statuses', () => {
  const input = demoInput.parse({
    ...sample,
    name: '  Test Visitor  ',
    email: 'INQUIRY@example.test',
    status: 'approved',
  });
  expect(input.name).toBe('Test Visitor');
  expect(input.email).toBe('inquiry@example.test');
  expect(input).not.toHaveProperty('status');
});
it('enforces per-email abuse limits without additional saves', async () => {
  for (let i = 0; i < 3; i++) await submitDemoInquiry(sample, `request-${i}`);
  await expect(submitDemoInquiry(sample, 'other')).rejects.toThrow('Too many');
  expect(await mongoose.connection.db!.collection('demoinquiries').countDocuments()).toBe(3);
});
it('enforces request budgets across changing email addresses', async () => {
  for (let i = 0; i < 5; i++)
    await submitDemoInquiry({ ...sample, email: `test${i}@example.test` }, 'same-request');
  await expect(
    submitDemoInquiry({ ...sample, email: 'other@example.test' }, 'same-request'),
  ).rejects.toThrow('Too many');
  expect(await mongoose.connection.db!.collection('demoinquiries').countDocuments()).toBe(5);
});
