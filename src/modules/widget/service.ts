import 'server-only';
import { requireUser } from '@/server/session';
import { AccessDenied } from '@/modules/organizations/policy';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { providerConfiguration } from '@/modules/conversations/provider';
import { humanReplyInput, widgetSettingsInput } from './input';
import {
  getConversationDetail,
  listInbox,
  readInstallation,
  replyAsHuman,
  resumeAiConversation,
  takeOverConversation,
  writeInstallation,
} from './repository';

function aiAvailable() {
  try {
    providerConfiguration();
    return true;
  } catch {
    return false;
  }
}

export async function getWidgetSettings(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  return {
    workspace,
    settings: await readInstallation(workspace.id, user.id, aiAvailable()),
    loaderBase: process.env.BETTER_AUTH_URL ?? '',
  };
}

export async function saveWidgetSettings(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  const input = widgetSettingsInput.parse(raw);
  await limitMutation(user.id);
  await writeInstallation(workspace.id, user.id, input);
}

export async function getInbox(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  return { workspace, ...(await listInbox(workspace.id, user.id)) };
}

export async function getInboxConversation(slug: string, conversationId: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  const conversation = await getConversationDetail(workspace.id, conversationId, user.id);
  return { workspace, conversation, userId: user.id };
}

export async function takeOverInboxConversation(slug: string, conversationId: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  await limitMutation(user.id);
  return takeOverConversation(workspace.id, conversationId, user.id);
}

export async function resumeInboxAi(slug: string, conversationId: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  await limitMutation(user.id);
  return resumeAiConversation(workspace.id, conversationId, user.id);
}

export async function sendHumanInboxReply(slug: string, conversationId: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = humanReplyInput.parse(raw);
  await limitMutation(user.id);
  return replyAsHuman(workspace.id, conversationId, user.id, input.content);
}

export async function assignInboxConversation(
  slug: string,
  conversationId: string,
  assigneeId: string,
) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  await limitMutation(user.id);
  const { assignConversation } = await import('./repository');
  return assignConversation(workspace.id, conversationId, user.id, assigneeId);
}
