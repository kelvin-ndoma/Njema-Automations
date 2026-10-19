// Local operator-only password reset for the sole Super Admin. Never prints the password.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { hashPassword } from 'better-auth/crypto';
import { getAuth } from '../src/server/auth';
import { authClient } from '../src/server/db';
import { getEnv } from '../src/server/env';
import { SUPER_ADMIN_EMAIL } from '../src/modules/platform/repository';

function generatePassword() {
  // 24 bytes → base64url ≈ 32 chars; meets the 12–128 length policy without special handling.
  return randomBytes(24).toString('base64url');
}

let stage = 'configuration';
async function main() {
  const env = getEnv();
  const client = authClient();
  const db = client.db(env.MONGODB_DB);
  try {
    stage = 'database ping';
    await db.command({ ping: 1 });
    stage = 'account lookup';
    const user = await db
      .collection('user')
      .findOne({ email: SUPER_ADMIN_EMAIL }, { projection: { _id: 1, name: 1, email: 1 } });
    if (!user) throw new Error('Super Admin account not found.');
    const userId = String(user._id);
    const account = await db.collection('account').findOne({
      userId: { $in: [userId, user._id] },
      providerId: 'credential',
    });
    if (!account) throw new Error('Credential account not found.');

    stage = 'password hash';
    const password = generatePassword();
    if (password.length < 12 || password.length > 128)
      throw new Error('Generated password failed length policy.');
    const passwordHash = await hashPassword(password);
    stage = 'password update';
    const updated = await db
      .collection('account')
      .updateOne(
        { _id: account._id, providerId: 'credential' },
        { $set: { password: passwordHash, updatedAt: new Date() } },
      );
    if (updated.matchedCount !== 1) throw new Error('Password update failed.');

    stage = 'session revocation';
    await db.collection('session').deleteMany({ userId: { $in: [userId, user._id] } });
    await db.collection('identityAudit').insertOne({
      actorId: userId,
      action: 'user.password.reset.local',
      createdAt: new Date(),
    });

    stage = 'password file';
    await mkdir('.runtime', { recursive: true });
    await writeFile('.runtime/super-admin-password.txt', `${password}\n`, { mode: 0o600 });

    stage = 'login verification';
    const verified = await getAuth().api.signInEmail({
      body: { email: SUPER_ADMIN_EMAIL, password },
    });
    if (verified.user.id !== userId) throw new Error('Login verification failed.');

    console.log(
      JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        passwordReset: true,
        sessionsRevoked: true,
        loginVerified: true,
        passwordFile: '.runtime/super-admin-password.txt',
      }),
    );
  } finally {
    await client.close();
  }
}

main().catch(() => {
  console.error(
    `Password reset stopped at: ${stage}. Verify database access. No credentials were logged.`,
  );
  process.exitCode = 1;
});
