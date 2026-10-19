'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { ConfigurationConflict } from './input';
import { saveEmployeeConfiguration, updateEmployeeStatus } from './service';

export interface EmployeeFormState {
  success?: boolean;
  error?: string;
}
export async function saveEmployee(
  slug: string,
  _state: EmployeeFormState,
  form: FormData,
): Promise<EmployeeFormState> {
  try {
    await saveEmployeeConfiguration(slug, {
      ...Object.fromEntries(form),
      allowedActions: form.getAll('allowedActions').map(String),
    });
  } catch (error) {
    if (error instanceof ConfigurationConflict) return { error: error.message };
    if (error instanceof AccessDenied) return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your entries.' };
    return { error: 'Could not save your employee. Check your access and try again.' };
  }
  revalidatePath(`/app/${slug}/employee`);
  revalidatePath(`/app/${slug}`);
  return { success: true };
}

export async function setEmployeeStatusAction(
  slug: string,
  _state: EmployeeFormState,
  form: FormData,
): Promise<EmployeeFormState> {
  try {
    await updateEmployeeStatus(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof ConfigurationConflict) return { error: error.message };
    if (error instanceof AccessDenied) return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Could not update status.' };
    return { error: 'Could not update employee status.' };
  }
  revalidatePath(`/app/${slug}/employee`);
  revalidatePath(`/app/${slug}`);
  revalidatePath(`/app/${slug}/widget`);
  return { success: true };
}
