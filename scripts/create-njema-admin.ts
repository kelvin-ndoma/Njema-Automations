// Explicit one-time user-requested provisioning. No password/URI/token output.
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { getAuth } from '../src/server/auth';
import { authClient } from '../src/server/db';
import { getEnv } from '../src/server/env';
import { SUPER_ADMIN_EMAIL, hasSuperAdminGrant } from '../src/modules/platform/repository';
import { workspaceFor } from '../src/modules/organizations/service';
import { grantOrganizationAdmin } from '../src/modules/organizations/repository';

const email = 'simonmusyoki19@gmail.com';
const slug = 'njema';
let stage = 'configuration';
async function signIn(emailAddress: string, password: string) {
  const response = await getAuth().api.signInEmail({
    body: { email: emailAddress, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error('Authentication failed.');
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const session = await getAuth().api.getSession({ headers: new Headers({ Cookie: cookie }) });
  if (!session) throw new Error('Persisted session verification failed.');
  return session.user;
}
async function main() {
  const env = getEnv();
  const db = authClient().db(env.MONGODB_DB);
  stage = 'operator authentication';
  const password = (await readFile('.runtime/super-admin-password.txt', 'utf8')).trim();
  const actor = await signIn(SUPER_ADMIN_EMAIL, password);
  if (!(await hasSuperAdminGrant(db, actor.id)))
    throw new Error('Operator platform grant unavailable.');
  stage = 'organization authorization';
  const workspace = await workspaceFor(actor.id, slug, 'members:manage');
  const indexes = await db.collection('memberships').listIndexes().toArray();
  if (
    !indexes.some(
      (index) => index.unique && index.key.organizationId === 1 && index.key.userId === 1,
    )
  )
    throw new Error('Required unique membership index unavailable.');
  const platformGrantCount = await db.collection('platformRoles').countDocuments();
  stage = 'target account lookup';
  const existing = await db.collection('user').findOne({ email }, { projection: { _id: 1 } });
  let targetId = existing ? String(existing._id) : '';
  if (!existing) {
    stage = 'target account creation';
    const created = await getAuth().api.signUpEmail({
      body: { name: 'Simon Musyoki', email, password },
    });
    targetId = created.user.id;
  }
  stage = 'organization admin assignment';
  if (await hasSuperAdminGrant(db, targetId))
    throw new Error('Target has unexpected platform privileges.');
  await grantOrganizationAdmin(workspace.id, actor.id, targetId);
  stage = 'membership and privilege verification';
  const targetWorkspace = await workspaceFor(targetId, slug, 'members:manage');
  if (targetWorkspace.role !== 'admin') throw new Error('Admin membership verification failed.');
  if (await hasSuperAdminGrant(db, targetId))
    throw new Error('Target has unexpected platform privileges.');
  if ((await db.collection('platformRoles').countDocuments()) !== platformGrantCount)
    throw new Error('Platform grant count changed unexpectedly.');
  if (!existing) {
    stage = 'new account login verification';
    const target = await signIn(email, password);
    if (target.id !== targetId) throw new Error('Target identity mismatch.');
    await workspaceFor(target.id, slug, 'members:manage');
  }
  console.log(
    JSON.stringify({
      organization: 'Njema',
      email,
      role: 'admin',
      accountCreated: !existing,
      existingPasswordPreserved: !!existing,
      newAccountLoginVerified: !existing,
      platformPrivilegesGranted: false,
    }),
  );
}
try {
  await main();
} catch {
  console.error(
    `Organization admin provisioning stopped at: ${stage}. No private error details were logged. Existing passwords and platform grants were not changed.`,
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  await authClient().close();
}
