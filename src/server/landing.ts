import 'server-only';
import { cookies } from 'next/headers';
import { requireUser } from './session';
import { canAccessPlatform } from '@/modules/platform/service';
import { listWorkspaces } from '@/modules/organizations/service';
import { chooseLanding } from './landing-policy';
export async function resolveLanding(requested?: string) {
  const user = await requireUser();
  const platform = await canAccessPlatform();
  const workspaces = await listWorkspaces(user.id);
  return chooseLanding(
    platform,
    workspaces.map((w) => w.slug),
    requested,
    (await cookies()).get('workspace')?.value,
  );
}
