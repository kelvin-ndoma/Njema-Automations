'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { performPlatformOperation } from './operations-repository';
export interface OperationState {
  success?: boolean;
  error?: string;
  resourceId?: string;
}
export async function platformOperation(
  _state: OperationState,
  form: FormData,
): Promise<OperationState> {
  let resourceId: string | undefined;
  try {
    const result = await performPlatformOperation(Object.fromEntries(form));
    revalidatePath('/platform', 'layout');
    revalidatePath('/app', 'layout');
    resourceId = result?.resourceId;
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your entries.' };
    // Only fixed domain messages are returned, never database/driver errors.
    const safe = [
      'Price precision does not match the currency.',
      'Confirmation must match the organization address.',
      'Confirmation must match the account email.',
      'The sole Super Admin cannot be restricted or have sessions revoked here.',
      'Choose an enabled plan.',
      'Support access is disabled by platform policy.',
    ];
    return {
      error:
        error instanceof Error && safe.includes(error.message)
          ? error.message
          : 'Could not complete the operation. Check access and try again.',
    };
  }
  if (form.get('operation') === 'support.exit') redirect('/platform/support');
  if (form.get('operation') === 'support.enter') {
    const slug = String(form.get('confirmation') ?? '');
    // Open the real customer workspace experience in read-only support mode.
    if (slug) redirect(`/app/${slug}`);
  }
  return { success: true, resourceId };
}
