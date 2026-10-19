'use client';
import { useActionState } from 'react';
import { processFollowUpsAction } from '@/modules/jobs/actions';
import { Button } from './ui/button';

export function FollowUpProcessButton({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(processFollowUpsAction.bind(null, slug), {});
  return (
    <form action={action} className="space-y-2">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? 'Processing…' : 'Process due follow-ups'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Processed {state.processed ?? 0} due follow-up
          {(state.processed ?? 0) === 1 ? '' : 's'}.
        </p>
      )}
    </form>
  );
}
