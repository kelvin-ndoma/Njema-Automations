import 'server-only';
import { requireUser } from '@/server/session';
import { AccessDenied } from '@/modules/organizations/policy';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { listOpportunities } from '@/modules/crm/repository';
import { appointmentIdInput, appointmentRequestInput } from './input';
import {
  cancelAppointment,
  confirmAppointment,
  createAppointmentRequest,
  listAppointments,
} from './repository';

export async function getAppointmentsPage(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  const [appointments, pipeline] = await Promise.all([
    listAppointments(workspace.id, user.id),
    listOpportunities(workspace.id, user.id),
  ]);
  return {
    workspace,
    appointments,
    opportunities: pipeline.opportunities
      .filter((row) => row.status === 'open')
      .map((row) => ({
        id: row.id,
        title: row.title,
        contactName: row.contactName,
      })),
  };
}

export async function requestAppointment(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = appointmentRequestInput.parse(raw);
  await limitMutation(user.id);
  return createAppointmentRequest(workspace.id, user.id, input);
}

export async function confirmAppointmentRequest(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = appointmentIdInput.parse(raw);
  await limitMutation(user.id);
  return confirmAppointment(workspace.id, user.id, input.appointmentId);
}

export async function cancelAppointmentRequest(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = appointmentIdInput.parse(raw);
  await limitMutation(user.id);
  return cancelAppointment(workspace.id, user.id, input.appointmentId);
}
