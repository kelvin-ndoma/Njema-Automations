'use client';
import { useActionState } from 'react';
import { moveStageAction } from '@/modules/crm/actions';
import { Button } from './ui/button';

export function CrmStageForm({
  slug,
  opportunityId,
  stages,
  currentStage,
  editable,
}: {
  slug: string;
  opportunityId: string;
  stages: Array<{ key: string; label: string }>;
  currentStage: string;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(moveStageAction.bind(null, slug), {});
  if (!editable) {
    return <p className="text-xs text-muted-foreground">Stage: {currentStage}</p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <label className="text-xs">
        <span className="sr-only">Stage</span>
        <select
          name="stageKey"
          defaultValue={currentStage}
          className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
        >
          {stages.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Updating…' : 'Update'}
      </Button>
      {state.error && (
        <p role="alert" className="w-full text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
