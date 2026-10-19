'use client';
import { useActionState } from 'react';
import { acceptInvitationAction } from '@/modules/team/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitationAction, {});
  return (
    <form action={action} className="space-y-4 rounded-xl border border-input p-5">
      <div>
        <label htmlFor="invite-token" className="mb-2 block text-sm font-medium">
          Invitation token
        </label>
        <Input
          id="invite-token"
          name="token"
          required
          minLength={20}
          maxLength={200}
          defaultValue={token}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Accepting…' : 'Accept invitation'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
