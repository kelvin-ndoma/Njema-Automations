'use client';
import { useActionState } from 'react';
import { setEmployeeStatusAction } from '@/modules/employees/actions';
import type { EmployeeConfiguration } from '@/modules/employees/input';
import { Button } from './ui/button';

export function EmployeeStatusControl({
  slug,
  employee,
  editable,
}: {
  slug: string;
  employee: EmployeeConfiguration;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(setEmployeeStatusAction.bind(null, slug), {});
  if (!editable) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Status: <span className="capitalize">{employee.status}</span>
      </p>
    );
  }
  const nextStatus = employee.status === 'paused' ? 'active' : 'paused';
  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      <input type="hidden" name="revision" value={employee.revision} />
      <input type="hidden" name="status" value={nextStatus} />
      <p className="text-sm text-muted-foreground">
        Status: <span className="capitalize font-medium text-foreground">{employee.status}</span>
        {employee.status === 'paused'
          ? ' — website visitors cannot receive AI replies.'
          : ' — available on enabled website channels.'}
      </p>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Updating…' : nextStatus === 'paused' ? 'Pause employee' : 'Resume employee'}
      </Button>
      {state.error && (
        <p role="alert" className="basis-full text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
