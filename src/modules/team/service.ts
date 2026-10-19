import 'server-only';
import { requireUser } from '@/server/session';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import {
  invitationIdInput,
  invitationTokenInput,
  membershipActionInput,
  membershipRoleInput,
  teamInviteInput,
} from './input';
import {
  acceptInvitation,
  createInvitation,
  listTeam,
  revokeInvitation,
  revokeMembership,
  updateMembershipRole,
} from './repository';

export async function getTeamPage(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  const team = await listTeam(workspace.id, user.id);
  return {
    workspace,
    currentUserId: user.id,
    ...team,
    canManage:
      can(workspace.role, 'members:manage') && !workspace.readOnly && !workspace.supportMode,
  };
}

export async function inviteTeamMember(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'members:manage');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = teamInviteInput.parse(raw);
  await limitMutation(user.id);
  return createInvitation(workspace.id, user.id, input);
}

export async function revokeTeamInvitation(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'members:manage');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = invitationIdInput.parse(raw);
  await limitMutation(user.id);
  return revokeInvitation(workspace.id, user.id, input.invitationId);
}

export async function revokeTeamMember(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'members:manage');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = membershipActionInput.parse(raw);
  await limitMutation(user.id);
  return revokeMembership(workspace.id, user.id, input.membershipId);
}

export async function changeTeamMemberRole(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'members:manage');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = membershipRoleInput.parse(raw);
  await limitMutation(user.id);
  return updateMembershipRole(workspace.id, user.id, input);
}

export async function acceptTeamInvitation(raw: unknown) {
  const user = await requireUser();
  if (!user.email) throw new AccessDenied();
  const input = invitationTokenInput.parse(raw);
  await limitMutation(user.id);
  return acceptInvitation(user.id, user.email, input.token);
}
