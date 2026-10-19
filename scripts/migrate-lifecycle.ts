import { readFile } from 'node:fs/promises';
import { getAuth } from '../src/server/auth';
import { authClient } from '../src/server/db';
import { getEnv } from '../src/server/env';
import { SUPER_ADMIN_EMAIL } from '../src/modules/platform/repository';
import { initializeLegacyLifecycle } from '../src/modules/platform/lifecycle-migration';
import { createPlatformIndexes } from '../src/modules/platform/indexes';
try {
  const password = (await readFile('.runtime/super-admin-password.txt', 'utf8')).trim();
  const identity = await getAuth().api.signInEmail({
    body: { email: SUPER_ADMIN_EMAIL, password },
  });
  const client = authClient();
  const db = client.db(getEnv().MONGODB_DB);
  const count = await initializeLegacyLifecycle(db, client, identity.user.id, identity.token!);
  await createPlatformIndexes(db);
  console.log(
    JSON.stringify({
      initializedOrganizations: count,
      explicitPlatformIndexesProvisioned: true,
      existingLifecycleStatesPreserved: true,
    }),
  );
} catch {
  console.error('Lifecycle initialization failed. No private error details were logged.');
  process.exitCode = 1;
} finally {
  await authClient().close();
}
