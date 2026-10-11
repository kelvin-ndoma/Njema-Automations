import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDb, authClient } from '@/server/db';
import { getAuth } from '@/server/auth';
import { handleAuth } from '@/server/auth-http';
import {
  createWorkspace,
  listWorkspaces,
  recordSwitch,
  workspaceFor,
  limitMutation,
} from '@/modules/organizations/service';
import {
  AuditEvent,
  Membership,
  MutationLimit,
  Organization,
} from '@/modules/organizations/models';
let replica: MongoMemoryReplSet;
let userId: string;
let cookie = '';
const input = { name: 'Acme', slug: 'acme', currency: 'USD', timeZone: 'UTC', locale: 'en-US' };
async function authRequest(path: string, body?: unknown, session = '') {
  return getAuth().handler(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
        ...(session ? { Cookie: session } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.1' },
  });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = 'test';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.BETTER_AUTH_SECRET = 'test-only-secret-with-more-than-32-characters';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    MutationLimit.createIndexes(),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await authClient().close();
  await replica?.stop();
});
describe('authentication and tenant integration', () => {
  it('creates a global account and a persisted session', async () => {
    const response = await authRequest('sign-up/email', {
      name: 'Test Owner',
      email: 'owner@example.test',
      password: 'secure-test-password-123',
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    userId = body.user.id;
    cookie = response.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; ');
    expect(cookie).toContain('session_token');
    expect(response.headers.get('set-cookie')).toMatch(/httponly/i);
    const session = await authRequest('get-session', undefined, cookie);
    expect((await session.json()).user.id).toBe(userId);
  });
  it('rejects invalid credentials and unauthenticated sessions', async () => {
    const response = await authRequest('sign-in/email', {
      email: 'owner@example.test',
      password: 'wrong-password-123',
    });
    expect(response.status).toBe(401);
    expect(await (await authRequest('get-session')).json()).toBeNull();
  });
  it('creates organization, owner membership, and audit atomically', async () => {
    await createWorkspace(userId, input);
    const org = await workspaceFor(userId, 'acme');
    expect(org.role).toBe('owner');
    expect(await Membership.countDocuments({ organizationId: org.id, userId })).toBe(1);
    expect(
      await AuditEvent.countDocuments({ organizationId: org.id, action: 'organization.created' }),
    ).toBe(1);
  });
  it('rolls back duplicate organization creation', async () => {
    const before = await Membership.countDocuments();
    await expect(createWorkspace(userId, input)).rejects.toThrow();
    expect(await Membership.countDocuments()).toBe(before);
  });
  it('rolls back when owner membership insertion fails', async () => {
    const spy = vi
      .spyOn(Membership, 'create')
      .mockRejectedValueOnce(new Error('simulated failure'));
    try {
      await expect(
        createWorkspace(userId, { ...input, slug: 'rollback-business' }),
      ).rejects.toThrow('simulated failure');
    } finally {
      spy.mockRestore();
    }
    expect(await Organization.countDocuments({ slug: 'rollback-business' })).toBe(0);
  });
  it('requires the configured origin on auth POSTs', async () => {
    const response = await handleAuth(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(403);
  });
  it('accepts the local loopback alias through the HTTP authentication boundary', async () => {
    const response = await handleAuth(
      new Request('http://127.0.0.1:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'owner@example.test', password: 'secure-test-password-123' }),
      }),
    );
    expect(response.status).toBe(200);
    const sessionCookie = response.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; ');
    const session = await handleAuth(
      new Request('http://127.0.0.1:3000/api/auth/get-session', {
        headers: { Cookie: sessionCookie },
      }),
    );
    expect((await session.json()).user.id).toBe(userId);
  });
  it('rejects expired sessions', async () => {
    const response = await authRequest('sign-in/email', {
      email: 'owner@example.test',
      password: 'secure-test-password-123',
    });
    expect(response.status).toBe(200);
    const expiredCookie = response.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; ');
    const data = await response.json();
    await authClient()
      .db('test')
      .collection('session')
      .updateOne({ token: data.token }, { $set: { expiresAt: new Date(0) } });
    expect(await (await authRequest('get-session', undefined, expiredCookie)).json()).toBeNull();
  });
  it('limits auth requests per normalized identity', async () => {
    const request = () =>
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rate@example.test', password: 'invalid-password-123' }),
      });
    for (let i = 0; i < 5; i++) await handleAuth(request());
    expect((await handleAuth(request())).status).toBe(429);
  });
  it('denies cross-tenant access and switching', async () => {
    await createWorkspace('another-user', { ...input, slug: 'other-company' });
    await expect(workspaceFor(userId, 'other-company')).rejects.toThrow('access denied');
    await expect(recordSwitch(userId, 'other-company')).rejects.toThrow('access denied');
    expect((await listWorkspaces(userId)).map((w) => w.slug)).toEqual(['acme']);
  });
  it('supports multiple organizations and authorized switching', async () => {
    await createWorkspace(userId, { ...input, slug: 'second-company' });
    await recordSwitch(userId, 'second-company');
    expect(await listWorkspaces(userId)).toHaveLength(2);
    expect(
      await AuditEvent.countDocuments({ actorId: userId, action: 'organization.switched' }),
    ).toBe(1);
  });
  it('denies revoked membership immediately', async () => {
    const org = await Organization.findOne({ slug: 'second-company' });
    await Membership.updateOne({ organizationId: org!._id, userId }, { status: 'revoked' });
    await expect(workspaceFor(userId, 'second-company')).rejects.toThrow();
    await expect(recordSwitch(userId, 'second-company')).rejects.toThrow();
    expect(await listWorkspaces(userId)).toHaveLength(1);
  });
  it('enforces permission checks from persisted roles', async () => {
    const org = await Organization.findOne({ slug: 'acme' });
    await Membership.updateOne({ organizationId: org!._id, userId }, { role: 'viewer' });
    await expect(workspaceFor(userId, 'acme', 'organization:update')).rejects.toThrow();
    expect((await workspaceFor(userId, 'acme')).role).toBe('viewer');
  });
  it('rejects invalid input without writes', async () => {
    const before = await Organization.countDocuments();
    await expect(createWorkspace(userId, { ...input, timeZone: 'fake' })).rejects.toThrow();
    expect(await Organization.countDocuments()).toBe(before);
  });
  it('limits mutation bursts', async () => {
    for (let i = 0; i < 10; i++) await limitMutation('burst-user');
    await expect(limitMutation('burst-user')).rejects.toThrow('Too many');
  });
  it('records identity and session lifecycle without secrets', async () => {
    const events = await authClient()
      .db('test')
      .collection('identityAudit')
      .find({ actorId: userId })
      .toArray();
    expect(events.some((e) => e.action === 'user.created')).toBe(true);
    expect(events.some((e) => e.action === 'session.created')).toBe(true);
    expect(events.every((e) => !('token' in e) && !('password' in e) && !('email' in e))).toBe(
      true,
    );
  });
  it('logs out and invalidates the database session', async () => {
    expect((await authRequest('sign-out', {}, cookie)).status).toBe(200);
    expect(await (await authRequest('get-session', undefined, cookie)).json()).toBeNull();
  });
});
