'use client';
import { useActionState } from 'react';
import {
  cancelAppointmentAction,
  confirmAppointmentAction,
  requestAppointmentAction,
} from '@/modules/appointments/actions';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function RequestAppointmentForm({
  slug,
  opportunities,
  editable,
}: {
  slug: string;
  opportunities: Array<{ id: string; title: string; contactName: string }>;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(requestAppointmentAction.bind(null, slug), {});
  if (!editable) return null;
  if (!opportunities.length) {
    return (
      <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
        Create an open opportunity from a consented lead before requesting an appointment.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">Request appointment</h2>
      <p className="text-xs text-muted-foreground">
        Requests stay inside Relay. External calendar providers are not connected. Start time must
        be in the future.
      </p>
      <label className="block text-sm">
        <span className="mb-2 block font-medium">Opportunity</span>
        <select
          name="opportunityId"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {opportunities.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title} · {row.contactName}
            </option>
          ))}
        </select>
      </label>
      <div>
        <label htmlFor="appt-title" className="mb-2 block text-sm font-medium">
          Title
        </label>
        <Input id="appt-title" name="title" required minLength={2} maxLength={120} />
      </div>
      <div>
        <label htmlFor="appt-start" className="mb-2 block text-sm font-medium">
          Requested start
        </label>
        <Input id="appt-start" name="requestedStartAt" type="datetime-local" required />
      </div>
      <div>
        <label htmlFor="appt-duration" className="mb-2 block text-sm font-medium">
          Duration (minutes)
        </label>
        <Input
          id="appt-duration"
          name="durationMinutes"
          type="number"
          min={15}
          max={480}
          step={15}
          defaultValue={30}
          required
        />
      </div>
      <div>
        <label htmlFor="appt-notes" className="mb-2 block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="appt-notes"
          name="notes"
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-input bg-background p-3 text-sm"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save request'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Appointment request saved.
        </p>
      )}
    </form>
  );
}

export function AppointmentStatusButtons({
  slug,
  appointmentId,
  status,
  editable,
}: {
  slug: string;
  appointmentId: string;
  status: string;
  editable: boolean;
}) {
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmAppointmentAction.bind(null, slug),
    {},
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelAppointmentAction.bind(null, slug),
    {},
  );
  if (!editable) return null;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {status === 'requested' && (
        <form action={confirmAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button type="submit" size="sm" disabled={confirmPending}>
            {confirmPending ? 'Confirming…' : 'Confirm'}
          </Button>
        </form>
      )}
      {(status === 'requested' || status === 'confirmed') && (
        <form action={cancelAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button type="submit" size="sm" variant="outline" disabled={cancelPending}>
            {cancelPending ? 'Cancelling…' : 'Cancel'}
          </Button>
        </form>
      )}
      {(confirmState.error || cancelState.error) && (
        <p role="alert" className="basis-full text-xs text-red-700">
          {confirmState.error || cancelState.error}
        </p>
      )}
    </div>
  );
}
