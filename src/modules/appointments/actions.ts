'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { AppointmentUnavailable } from './input';
import {
  cancelAppointmentRequest,
  confirmAppointmentRequest,
  requestAppointment,
} from './service';

export interface AppointmentFormState {
  success?: boolean;
  error?: string;
}

export async function requestAppointmentAction(
  slug: string,
  _state: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  try {
    await requestAppointment(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof AppointmentUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the appointment details.' };
    return { error: 'Could not request the appointment.' };
  }
  revalidatePath(`/app/${slug}/appointments`);
  revalidatePath(`/app/${slug}/crm/pipeline`);
  return { success: true };
}

export async function confirmAppointmentAction(
  slug: string,
  _state: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  try {
    await confirmAppointmentRequest(slug, {
      appointmentId: String(form.get('appointmentId') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof AppointmentUnavailable)
      return { error: error.message };
    return { error: 'Could not confirm the appointment.' };
  }
  revalidatePath(`/app/${slug}/appointments`);
  return { success: true };
}

export async function cancelAppointmentAction(
  slug: string,
  _state: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  try {
    await cancelAppointmentRequest(slug, {
      appointmentId: String(form.get('appointmentId') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof AppointmentUnavailable)
      return { error: error.message };
    return { error: 'Could not cancel the appointment.' };
  }
  revalidatePath(`/app/${slug}/appointments`);
  return { success: true };
}
