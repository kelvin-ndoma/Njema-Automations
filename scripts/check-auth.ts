// Read-only authentication diagnostics. Never print connection strings, credentials,
// response bodies, identity records, cookies, tokens, or raw driver errors.
import { MongoClient } from 'mongodb';
import { getEnv } from '../src/server/env';

const knownCodes = new Set([
  'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPERM',
]);
function safeCodes(error: unknown, depth = 0): string[] {
  if (depth > 8 || typeof error !== 'object' || !error) return [];
  const result: string[] = [];
  if ('code' in error && typeof error.code === 'string' && knownCodes.has(error.code))
    result.push(error.code);
  if ('code' in error && error.code === 18) result.push('MONGODB_AUTHENTICATION_FAILED');
  for (const key of ['cause', 'error', 'reason'] as const) {
    if (key in error) result.push(...safeCodes((error as Record<string, unknown>)[key], depth + 1));
  }
  if ('servers' in error && error.servers instanceof Map) {
    for (const server of error.servers.values()) result.push(...safeCodes(server, depth + 1));
  }
  return [...new Set(result)];
}
async function main() {
  let env: ReturnType<typeof getEnv>;
  try {
    env = getEnv();
  } catch {
    console.log(
      'Environment validation: FAIL. Check MONGODB_URI, MONGODB_DB, BETTER_AUTH_SECRET and BETTER_AUTH_URL privately.',
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    'Environment validation: PASS. Expected variable names are MONGODB_URI, MONGODB_DB, BETTER_AUTH_SECRET and BETTER_AUTH_URL.',
  );
  const client = new MongoClient(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 5000,
  });
  try {
    await client.db(env.MONGODB_DB).command({ ping: 1 });
    console.log('MongoDB authenticated ping: PASS.');
    const hello = await client.db(env.MONGODB_DB).command({ hello: 1 });
    console.log(
      `Transaction-capable topology: ${Boolean(hello.setName || hello.msg === 'isdbgrid') ? 'PASS' : 'FAIL'}.`,
    );
    if (!hello.setName && hello.msg !== 'isdbgrid') process.exitCode = 1;
  } catch (error) {
    console.log('MongoDB authenticated ping: FAIL.');
    console.log(
      `Sanitized connection codes: ${safeCodes(error).join(', ') || 'UNCLASSIFIED_CONNECTION_FAILURE'}.`,
    );
    process.exitCode = 1;
  } finally {
    await client.close();
  }
  const origin = new URL(env.BETTER_AUTH_URL);
  if (!['localhost', '127.0.0.1'].includes(origin.hostname)) {
    console.log('HTTP endpoint probe skipped: configured origin is not loopback.');
    return;
  }
  try {
    const response = await fetch(origin.origin + '/api/auth/get-session', {
      signal: AbortSignal.timeout(10000),
    });
    console.log(`Local /api/auth/get-session HTTP status: ${response.status}.`);
    if (!response.ok) process.exitCode = 1;
  } catch (error) {
    console.log(
      `Local HTTP endpoint unavailable: ${safeCodes(error).join(', ') || 'UNCLASSIFIED_CONNECTION_FAILURE'}.`,
    );
    process.exitCode = 1;
  }
}
main().catch(() => {
  console.error('Authentication diagnostic failed. No private error details were logged.');
  process.exitCode = 1;
});
