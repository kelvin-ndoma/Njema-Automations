'use client';
import { useActionState } from 'react';
import { contactOptOutAction } from '@/modules/crm/actions';
import { Button } from './ui/button';

export function ContactOptOutButton({
  slug,
  contactId,
  optedOut,
  editable,
}: {
  slug: string;
  contactId: string;
  optedOut: boolean;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(contactOptOutAction.bind(null, slug), {});
  if (!editable) {
    return optedOut ? (
      <p className="mt-2 text-xs text-muted-foreground">Opted out of automated follow-ups</p>
    ) : null;
  }
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="communicationOptOut" value={optedOut ? 'false' : 'true'} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending
          ? 'Updating…'
          : optedOut
            ? 'Clear communication opt-out'
            : 'Opt out of automated follow-ups'}
      </Button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
