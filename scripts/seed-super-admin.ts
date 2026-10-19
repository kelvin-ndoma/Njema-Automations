import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { authClient } from '../src/server/db';
import { getAuth } from '../src/server/auth';
import { getEnv } from '../src/server/env';
import { seedSuperAdmin, SUPER_ADMIN_EMAIL } from '../src/modules/platform/repository';
async function readPassword(existing: boolean) {
  if (!process.stdin.isTTY)
    throw new Error('Run this command in an interactive terminal to choose an initial password.');
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  process.stdout.write(
    existing
      ? 'Existing super-admin account password (hidden): '
      : 'Initial super-admin password (12–128 characters, hidden): ',
  );
  const reader = createInterface({ input: process.stdin, output: muted, terminal: true });
  try {
    return await reader.question('');
  } finally {
    reader.close();
    process.stdout.write('\n');
  }
}
async function main() {
  const client = authClient();
  try {
    const db = client.db(getEnv().MONGODB_DB);
    const existing = await db
      .collection('user')
      .findOne({ email: SUPER_ADMIN_EMAIL }, { projection: { _id: 1 } });
    const password = await readPassword(!!existing);
    if (password.length < 12 || password.length > 128)
      throw new Error('Password must contain 12–128 characters.');
    if (!existing) {
      await getAuth().api.signUpEmail({
        body: { name: 'Kelvin', email: SUPER_ADMIN_EMAIL, password },
      });
    }
    // An unverified email lookup alone is not proof of account ownership.
    const authenticated = await getAuth().api.signInEmail({
      body: { email: SUPER_ADMIN_EMAIL, password },
    });
    const result = await seedSuperAdmin(db, client, authenticated.user.id);
    console.log(
      result?.created
        ? 'Sole platform super-admin assigned to the requested account.'
        : 'Requested account is already the sole platform super-admin.',
    );
  } finally {
    await client.close();
  }
}
main().catch(() => {
  console.error(
    'Super-admin seed failed. Verify configuration, connection and password requirements. No credentials were logged.',
  );
  process.exitCode = 1;
});
