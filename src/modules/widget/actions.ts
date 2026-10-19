'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { WidgetConflict, WidgetUnavailable } from './input';
import { saveWidgetSettings } from './service';

export interface WidgetFormState {
  success?: boolean;
  error?: string;
}

export async function saveWidget(
  slug: string,
  _state: WidgetFormState,
  form: FormData,
): Promise<WidgetFormState> {
  try {
    await saveWidgetSettings(slug, {
      enabled: form.get('enabled') === 'on',
      allowedOrigins: String(form.get('allowedOrigins') ?? ''),
      revision: form.get('revision'),
    });
  } catch (error) {
    if (error instanceof WidgetConflict || error instanceof WidgetUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your website origins.' };
    return { error: 'Could not save website installation. Check your access and try again.' };
  }
  revalidatePath(`/app/${slug}/widget`);
  return { success: true };
}
