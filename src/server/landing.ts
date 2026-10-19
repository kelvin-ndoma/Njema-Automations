import 'server-only';
import { cookies } from 'next/headers';
import { requireUser } from './session';
import { authClient } from './db';
import { getEnv } from './env';
import { hasPlatformAccess } from '@/modules/platform/repository';
import { listWorkspaces } from '@/modules/organizations/service';
import { chooseLanding } from './landing-policy';

export async function resolveLanding(requested?: string) {
  const user = await requireUser();
  // Parallelize the two independent membership lookups after a single session read.
  const [platform, workspaces] = await Promise.all([
    hasPlatformAccess(authClient().db(getEnv().MONGODB_DB), user.id),
    listWorkspaces(user.id),
  ]);
  return chooseLanding(
    platform,
    workspaces.map((w) => w.slug),
    requested,
    (await cookies()).get('workspace')?.value,
  );
}
