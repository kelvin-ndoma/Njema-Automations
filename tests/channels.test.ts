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
import { WidgetInstallation } from '@/modules/widget/models';
import { ChannelConnection } from '@/modules/channels/models';
import { attemptOutboundSend } from '@/modules/channels/repository';
import { getChannelsPage, saveChannel } from '@/modules/channels/service';

const state = vi.hoisted(() => ({ id: 'channel-owner' }));
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
  process.env.MONGODB_DB = 'channels-test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'channels-test-secret-over-32-characters-long';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
    WidgetInstallation.createIndexes(),
    ChannelConnection.createIndexes(),
  ]);
  await createWorkspace(state.id, {
    name: 'Channel Business',
    slug: 'channel-business',
    currency: 'USD',
    locale: 'en-US',
    timeZone: 'UTC',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});

it('stores email channel config without activating live delivery', async () => {
  const saved = await saveChannel('channel-business', {
    provider: 'email',
    displayName: 'Sales email',
    fromAddress: 'sales@channel.example',
    replyToAddress: '',
    credentialSecret: 'provider-secret-value',
  });
  expect(saved.status).toBe('configured');
  expect(saved.activationBlocked).toBe(true);
  expect(saved.hasCredentials).toBe(true);
  const page = await getChannelsPage('channel-business');
  const email = page.channels.find((row) => row.provider === 'email');
  expect(email?.status).toBe('configured');
  expect(email?.hasCredentials).toBe(true);
  expect(email?.activationBlocked).toBe(true);
  // Ciphertext must never appear in page DTOs.
  expect(JSON.stringify(page)).not.toMatch(/provider-secret-value/);
  await expect(
    attemptOutboundSend({
      organizationId: page.workspace.id,
      provider: 'email',
      to: 'prospect@example.com',
      body: 'Hello',
    }),
  ).rejects.toThrow(/not activated/i);
});
