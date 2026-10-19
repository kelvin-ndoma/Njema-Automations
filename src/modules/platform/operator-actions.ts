'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { grantPlatformAdministrator, revokePlatformAdministrator } from './service';

export interface OperatorFormState {
  success?: boolean;
  error?: string;
}

export async function grantPlatformAdminAction(
  _state: OperatorFormState,
  form: FormData,
): Promise<OperatorFormState> {
  try {
    await grantPlatformAdministrator(Object.fromEntries(form));
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the grant details.' };
    if (error instanceof Error) return { error: error.message };
    return { error: 'Could not grant platform administrator access.' };
  }
  revalidatePath('/platform/operators');
  return { success: true };
}

export async function revokePlatformAdminAction(
  _state: OperatorFormState,
  form: FormData,
): Promise<OperatorFormState> {
  try {
    await revokePlatformAdministrator(Object.fromEntries(form));
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the revocation details.' };
    if (error instanceof Error) return { error: error.message };
    return { error: 'Could not revoke platform administrator access.' };
  }
  revalidatePath('/platform/operators');
  return { success: true };
}
