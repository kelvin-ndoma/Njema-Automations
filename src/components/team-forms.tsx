'use client';
import { useActionState } from 'react';
import {
  changeMemberRoleAction,
  inviteMemberAction,
  revokeInvitationAction,
  revokeMemberAction,
} from '@/modules/team/actions';
import { inviteRoleOptions } from '@/modules/team/input';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function InviteMemberForm({ slug, canManage }: { slug: string; canManage: boolean }) {
  const [state, action, pending] = useActionState(inviteMemberAction.bind(null, slug), {});
  if (!canManage) return null;
  return (
    <form action={action} className="space-y-4 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">Invite teammate</h2>
      <p className="text-xs text-muted-foreground">
        Email delivery is not configured. Copy the accept link after creating the invitation and
        share it securely with the invited person.
      </p>
      <div>
        <label htmlFor="invite-email" className="mb-2 block text-sm font-medium">
          Email
        </label>
        <Input id="invite-email" name="email" type="email" required maxLength={254} />
      </div>
      <label className="block text-sm">
        <span className="mb-2 block font-medium">Role</span>
        <select
          name="role"
          required
          defaultValue="agent"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {inviteRoleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create invitation'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.inviteLink && (
        <p role="status" className="break-all text-sm text-primary">
          Accept link (shown once): {state.inviteLink}
        </p>
      )}
    </form>
  );
}

export function RevokeInvitationButton({
  slug,
  invitationId,
  canManage,
}: {
  slug: string;
  invitationId: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(revokeInvitationAction.bind(null, slug), {});
  if (!canManage) return null;
  return (
    <form action={action}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Revoking…' : 'Revoke'}
      </Button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function MemberRoleForm({
  slug,
  membershipId,
  role,
  canManage,
  isOwner,
}: {
  slug: string;
  membershipId: string;
  role: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  const [state, action, pending] = useActionState(changeMemberRoleAction.bind(null, slug), {});
  if (!canManage || isOwner) {
    return <span className="capitalize text-sm text-muted-foreground">{role}</span>;
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <select
        name="role"
        defaultValue={role}
        className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
      >
        {inviteRoleOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Update'}
      </Button>
      {state.error && (
        <p role="alert" className="basis-full text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function RevokeMemberButton({
  slug,
  membershipId,
  canManage,
  disabled,
}: {
  slug: string;
  membershipId: string;
  canManage: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(revokeMemberAction.bind(null, slug), {});
  if (!canManage || disabled) return null;
  return (
    <form action={action}>
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Removing…' : 'Remove'}
      </Button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
