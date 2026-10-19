'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { TeamUnavailable } from './input';
import {
  acceptTeamInvitation,
  changeTeamMemberRole,
  inviteTeamMember,
  revokeTeamInvitation,
  revokeTeamMember,
} from './service';

export interface TeamFormState {
  success?: boolean;
  error?: string;
  inviteLink?: string;
}

export async function inviteMemberAction(
  slug: string,
  _state: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  try {
    const created = await inviteTeamMember(slug, Object.fromEntries(form));
    revalidatePath(`/app/${slug}/team`);
    return {
      success: true,
      inviteLink: `/invitations/accept?token=${encodeURIComponent(created.token)}`,
    };
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof TeamUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the invitation details.' };
    return { error: 'Could not create the invitation.' };
  }
}

export async function revokeInvitationAction(
  slug: string,
  _state: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  try {
    await revokeTeamInvitation(slug, {
      invitationId: String(form.get('invitationId') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof TeamUnavailable)
      return { error: error.message };
    return { error: 'Could not revoke the invitation.' };
  }
  revalidatePath(`/app/${slug}/team`);
  return { success: true };
}

export async function revokeMemberAction(
  slug: string,
  _state: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  try {
    await revokeTeamMember(slug, {
      membershipId: String(form.get('membershipId') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof TeamUnavailable)
      return { error: error.message };
    return { error: 'Could not revoke membership.' };
  }
  revalidatePath(`/app/${slug}/team`);
  return { success: true };
}

export async function changeMemberRoleAction(
  slug: string,
  _state: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  try {
    await changeTeamMemberRole(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof TeamUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the role.' };
    return { error: 'Could not update the role.' };
  }
  revalidatePath(`/app/${slug}/team`);
  return { success: true };
}

export async function acceptInvitationAction(
  _state: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  try {
    const result = await acceptTeamInvitation({
      token: String(form.get('token') ?? ''),
    });
    redirect(`/app/${result.slug}`);
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof TeamUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Invitation token is invalid.' };
    // Next.js redirect throws; rethrow redirects.
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return { error: 'Could not accept the invitation.' };
  }
}
