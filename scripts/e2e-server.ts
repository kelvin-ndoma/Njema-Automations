import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
const replica = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '8.2.1' },
});
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.MONGODB_URI = replica.getUri();
process.env.MONGODB_DB = 'e2e';
process.env.BETTER_AUTH_SECRET = 'local-e2e-only-secret-at-least-32-characters';
process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3100';
const { connectDb } = await import('../src/server/db');
const { Organization, Membership, AuditEvent, MutationLimit } =
  await import('../src/modules/organizations/models');
await connectDb();
await Promise.all([
  Organization.createIndexes(),
  Membership.createIndexes(),
  AuditEvent.createIndexes(),
  MutationLimit.createIndexes(),
]);
// Explicit development fixtures in a disposable database only.
const { getAuth } = await import('../src/server/auth');
const { authClient } = await import('../src/server/db');
const { seedSuperAdmin, SUPER_ADMIN_EMAIL } = await import('../src/modules/platform/repository');
const admin = await getAuth().api.signUpEmail({
  body: {
    name: 'Development Super Admin',
    email: SUPER_ADMIN_EMAIL,
    password: 'development-test-password-123',
  },
});
const owner = await getAuth().api.signUpEmail({
  body: {
    name: 'Development Owner',
    email: 'platform-owner@example.test',
    password: 'development-test-password-123',
  },
});
await seedSuperAdmin(authClient().db('e2e'), authClient());
const fixtures = Array.from({ length: 18 }, (_, i) => ({
  name: `Development Business ${String(i + 1).padStart(2, '0')}`,
  slug: `development-business-${i + 1}`,
  currency: 'EUR',
  locale: 'en-GB',
  timeZone: 'UTC',
  createdAt: new Date(Date.now() - i * 86400000),
}));
const organizations = await Organization.insertMany(fixtures);
await Membership.insertMany(
  organizations.map((org) => ({
    organizationId: org._id,
    userId: owner.user.id,
    role: 'owner',
    status: 'active',
  })),
);
await Membership.create({
  organizationId: organizations[17]._id,
  userId: admin.user.id,
  role: 'viewer',
  status: 'active',
});
const orgAdmin = await getAuth().api.signUpEmail({
  body: {
    name: 'Development Organization Admin',
    email: 'org-admin@example.test',
    password: 'development-test-password-123',
  },
});
await Membership.create({
  organizationId: organizations[0]._id,
  userId: orgAdmin.user.id,
  role: 'admin',
  status: 'active',
});
await mkdir('.runtime', { recursive: true });
await writeFile(
  '.runtime/e2e-database.json',
  JSON.stringify({ uri: replica.getUri(), adminId: admin.user.id }),
  { mode: 0o600 },
);
const development = process.env.E2E_DEV === '1';
if (development) await import('./fix-dev-performance.mjs');
const child = spawn(
  'node_modules/node/bin/node',
  [
    'node_modules/next/dist/bin/next',
    development ? 'dev' : 'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3100',
    ...(development ? ['--webpack'] : []),
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: development ? 'development' : 'production',
      NEXT_BUILD_DIR: development ? '.next-platform-dev-tests' : '.next-platform-tests',
    },
    stdio: 'inherit',
  },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  child.kill('SIGTERM');
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect();
  await authClient().close();
  await replica.stop();
  await unlink('.runtime/e2e-database.json').catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', stop);
