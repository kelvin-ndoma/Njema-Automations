import 'server-only';
import { requireUser } from '@/server/session';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { AccessDenied } from '@/modules/organizations/policy';
import { listFollowUps, processDueFollowUps } from './repository';

export async function getFollowUps(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  return { workspace, followUps: await listFollowUps(workspace.id, user.id) };
}

export async function runDueFollowUps(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  await limitMutation(user.id);
  return processDueFollowUps(workspace.id, user.id);
}
