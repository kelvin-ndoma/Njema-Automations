'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/session';
import { createWorkspace, recordSwitch, saveBusinessSettings } from './service';
export interface FormState {
  error?: string;
  success?: boolean;
}
export async function updateSettings(
  slug: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();
  try {
    await saveBusinessSettings(user.id, slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your entries.' };
    return { error: 'Could not save settings. Check your access and try again.' };
  }
  revalidatePath(`/app/${slug}`, 'layout');
  return { success: true };
}
export async function createOrganization(_state: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  let slug: string;
  try {
    slug = await createWorkspace(user.id, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your entries.' };
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000)
      return { error: 'That workspace address is already in use.' };
    return { error: 'Could not create the workspace. Check your connection or try again shortly.' };
  }
  redirect(`/app/${slug}`);
}
export async function switchOrganization(form: FormData) {
  const user = await requireUser();
  const slug = String(form.get('slug') ?? '');
  const workspace = await recordSwitch(user.id, slug);
  (await cookies()).set('workspace', workspace.slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/app/${workspace.slug}`);
}
