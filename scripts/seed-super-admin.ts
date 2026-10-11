import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { authClient } from '../src/server/db';
import { getAuth } from '../src/server/auth';
import { getEnv } from '../src/server/env';
import { seedSuperAdmin, SUPER_ADMIN_EMAIL } from '../src/modules/platform/repository';
async function readPassword() {
  if (!process.stdin.isTTY)
    throw new Error('Run this command in an interactive terminal to choose an initial password.');
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  process.stdout.write('Initial super-admin password (12–128 characters, hidden): ');
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
    if (!existing) {
      const password = await readPassword();
      if (password.length < 12 || password.length > 128)
        throw new Error('Password must contain 12–128 characters.');
      await getAuth().api.signUpEmail({
        body: { name: 'Kelvin', email: SUPER_ADMIN_EMAIL, password },
      });
    }
    const result = await seedSuperAdmin(db, client);
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
