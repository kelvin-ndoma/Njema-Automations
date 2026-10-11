import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
const replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.2.1' } });
process.env.MONGODB_URI = replica.getUri(); process.env.MONGODB_DB = 'e2e';
process.env.BETTER_AUTH_SECRET = 'local-e2e-only-secret-at-least-32-characters'; process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000';
const { connectDb } = await import('../src/server/db');
const { Organization, Membership, AuditEvent, MutationLimit } = await import('../src/modules/organizations/models');
await connectDb(); await Promise.all([Organization.createIndexes(), Membership.createIndexes(), AuditEvent.createIndexes(), MutationLimit.createIndexes()]);
const child = spawn('node_modules/node/bin/node', ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], { env: process.env, stdio: 'inherit' });
let stopping = false;
async function stop() { if (stopping) return; stopping = true; child.kill('SIGTERM'); const mongoose = await import('mongoose'); await mongoose.default.disconnect(); await replica.stop(); process.exit(0); }
process.on('SIGTERM', stop); process.on('SIGINT', stop); child.on('exit', stop);
