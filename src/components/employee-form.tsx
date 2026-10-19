'use client';
import { useActionState } from 'react';
import { saveEmployee } from '@/modules/employees/actions';
import {
  legacySalesAgentDefaults,
  salesAgentActions,
  type EmployeeConfiguration,
} from '@/modules/employees/input';
import { Input } from './ui/input';
import { Button } from './ui/button';

const actionLabels: Record<(typeof salesAgentActions)[number], string> = {
  continue: 'Continue the conversation',
  request_contact: 'Request contact details',
  escalate_human: 'Escalate to a human teammate',
  record_qualification: 'Record a qualification note in CRM',
  advance_opportunity: 'Advance the CRM opportunity stage (requires consented lead)',
  schedule_follow_up: 'Schedule an in-app follow-up reminder (requires consented lead)',
  request_quotation: 'Request a quotation draft for human pricing (requires consented lead)',
  request_appointment: 'Request a provisional appointment for human confirmation (requires consented lead)',
};

export function EmployeeForm({
  slug,
  employee,
  editable,
}: {
  slug: string;
  employee: EmployeeConfiguration | null;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveEmployee.bind(null, slug), {});
  const selected = new Set(employee?.allowedActions ?? legacySalesAgentDefaults.allowedActions);
  return (
    <form action={action} className="mt-6 space-y-6">
      <input type="hidden" name="revision" value={employee?.revision ?? 0} />
      <fieldset disabled={!editable || pending} className="space-y-6 disabled:opacity-75">
        <div>
          <label htmlFor="employee-name" className="mb-2 block text-sm font-medium">
            Employee name
          </label>
          <Input
            id="employee-name"
            name="name"
            defaultValue={employee?.name ?? ''}
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        {(
          [
            [
              'goal',
              'Sales goal',
              'What should this employee accomplish in each conversation?',
              10,
              2000,
              3,
              employee?.goal ?? legacySalesAgentDefaults.goal,
            ],
            [
              'instructions',
              'Conversation instructions',
              'Describe your sales approach, questions to ask, and how to stay on brand.',
              10,
              4000,
              5,
              employee?.instructions ?? '',
            ],
            [
              'qualificationCriteria',
              'Qualification criteria',
              'What must the employee learn before treating a visitor as sales-ready?',
              10,
              4000,
              5,
              employee?.qualificationCriteria ?? legacySalesAgentDefaults.qualificationCriteria,
            ],
            [
              'escalationRules',
              'Escalation rules',
              'When must the employee hand the conversation to a human teammate?',
              10,
              2000,
              4,
              employee?.escalationRules ?? legacySalesAgentDefaults.escalationRules,
            ],
            [
              'knowledge',
              'Approved business knowledge',
              'Add facts your employee may use: offerings, prices, opening hours and answers to common questions. Do not include passwords or private customer information.',
              20,
              20000,
              12,
              employee?.knowledge ?? '',
            ],
            [
              'fallback',
              'Answer when information is missing',
              'Write an honest response that directs the visitor to your team when the approved knowledge does not answer their question.',
              10,
              500,
              3,
              employee?.fallback ?? '',
            ],
          ] as const
        ).map(([name, label, help, minLength, maxLength, rows, value]) => (
          <div key={name}>
            <label htmlFor={name} className="mb-2 block text-sm font-medium">
              {label}
            </label>
            <p id={`${name}-help`} className="mb-2 text-sm leading-6 text-muted-foreground">
              {help}
            </p>
            <textarea
              id={name}
              name={name}
              aria-describedby={`${name}-help`}
              defaultValue={value}
              minLength={minLength}
              maxLength={maxLength}
              rows={rows}
              required
              className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
        ))}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Allowed sales actions</legend>
          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            The employee may only choose from these implemented workflow actions. Quotation and
            appointment requests still need human pricing/confirmation. Payments and calendar sync
            are not available yet.
          </p>
          <div className="space-y-2">
            {salesAgentActions.map((actionName) => (
              <label key={actionName} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="allowedActions"
                  value={actionName}
                  defaultChecked={selected.has(actionName)}
                  className="mt-1"
                />
                <span>{actionLabels[actionName]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {editable && (
          <Button type="submit">{pending ? 'Saving…' : 'Save employee configuration'}</Button>
        )}
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Employee configuration saved.
        </p>
      )}
      {!editable && (
        <p className="text-sm text-muted-foreground">
          An owner or administrator can update this configuration.
        </p>
      )}
    </form>
  );
}
