import 'server-only';
import { requireUser } from '@/server/session';
import { AccessDenied } from '@/modules/organizations/policy';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { channelConfigInput } from './input';
import { listChannelConnections, saveChannelConfiguration } from './repository';

export async function getChannelsPage(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  const channels = await listChannelConnections(workspace.id, user.id);
  return { workspace, channels };
}

export async function saveChannel(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = channelConfigInput.parse(raw);
  await limitMutation(user.id);
  return saveChannelConfiguration(workspace.id, user.id, input);
}
