'use client';
import { useActionState } from 'react';
import { assignConversationAction } from '@/modules/widget/inbox-actions';
import { Button } from './ui/button';

export function InboxAssignForm({
  slug,
  conversationId,
  assigneeId,
  teamMembers,
  readOnly,
}: {
  slug: string;
  conversationId: string;
  assigneeId: string | null;
  teamMembers: Array<{ userId: string; role: string; name: string | null; email: string | null }>;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(
    assignConversationAction.bind(null, slug, conversationId),
    {},
  );
  if (readOnly) return null;
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="block min-w-[12rem] flex-1 text-sm">
        <span className="mb-2 block font-medium">Assign to teammate</span>
        <select
          name="assigneeId"
          required
          defaultValue={assigneeId ?? ''}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select member
          </option>
          {teamMembers.map((member) => (
            <option key={member.userId} value={member.userId}>
              {(member.name || member.email || member.userId) + ` (${member.role})`}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={pending || !teamMembers.length}>
        {pending ? 'Assigning…' : 'Assign'}
      </Button>
      {state.error && (
        <p role="alert" className="basis-full text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="basis-full text-sm text-primary">
          Assigned. AI publishing is paused until resumed.
        </p>
      )}
    </form>
  );
}
