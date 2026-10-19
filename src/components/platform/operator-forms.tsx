'use client';
import { useActionState } from 'react';
import {
  grantPlatformAdminAction,
  revokePlatformAdminAction,
} from '@/modules/platform/operator-actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function GrantPlatformAdminForm() {
  const [state, action, pending] = useActionState(grantPlatformAdminAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">Grant Platform Admin</h2>
      <p className="text-xs text-muted-foreground">
        Platform Admins can enter Support Mode to mask into customer orgs and run day-to-day
        support operations. They cannot suspend orgs, change plans, or grant platform roles.
      </p>
      <Input name="userId" required maxLength={40} placeholder="User id" />
      <Input name="confirmation" required maxLength={40} placeholder="Type the same user id" />
      <Button type="submit" disabled={pending}>
        {pending ? 'Granting…' : 'Grant platform admin'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Platform administrator granted.
        </p>
      )}
    </form>
  );
}

export function RevokePlatformAdminForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(revokePlatformAdminAction, {});
  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="confirmation" value={userId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Revoking…' : 'Revoke'}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
