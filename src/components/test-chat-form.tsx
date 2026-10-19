'use client';
import { useActionState, useState } from 'react';
import { testEmployee } from '@/modules/conversations/actions';
import { Button } from './ui/button';

export function TestChatForm({
  slug,
  requestId,
  enabled,
}: {
  slug: string;
  requestId: string;
  enabled: boolean;
}) {
  const [id, setId] = useState(requestId);
  const [state, action, pending] = useActionState(
    async (previous: import('@/modules/conversations/actions').TestChatState, form: FormData) => {
      const result = await testEmployee(slug, previous, form);
      setId(crypto.randomUUID());
      return result;
    },
    {},
  );
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="requestId" value={id} />
      <label htmlFor="question" className="block text-sm font-medium">
        Test question
      </label>
      <textarea
        id="question"
        name="question"
        rows={3}
        minLength={2}
        maxLength={2000}
        required
        disabled={!enabled || pending}
        className="w-full rounded-lg border border-input p-3 text-sm"
      />
      <Button type="submit" disabled={!enabled || pending}>
        {pending ? 'Generating reply…' : 'Ask employee'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Reply saved below.
        </p>
      )}
    </form>
  );
}
