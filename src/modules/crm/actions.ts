'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { ContactConflict } from './input';
import { createContact, updateContactOptOut, updateOpportunityStage } from './service';

export interface CrmFormState {
  success?: boolean;
  error?: string;
}

export async function createContactAction(
  slug: string,
  _state: CrmFormState,
  form: FormData,
): Promise<CrmFormState> {
  try {
    await createContact(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof ContactConflict)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the contact details.' };
    return { error: 'Could not create the contact.' };
  }
  revalidatePath(`/app/${slug}/crm`);
  revalidatePath(`/app/${slug}/crm/pipeline`);
  return { success: true };
}

export async function moveStageAction(
  slug: string,
  _state: CrmFormState,
  form: FormData,
): Promise<CrmFormState> {
  try {
    await updateOpportunityStage(slug, {
      opportunityId: String(form.get('opportunityId') ?? ''),
      stageKey: String(form.get('stageKey') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied) return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the stage selection.' };
    return { error: 'Could not update the opportunity stage.' };
  }
  revalidatePath(`/app/${slug}/crm/pipeline`);
  return { success: true };
}

export async function contactOptOutAction(
  slug: string,
  _state: CrmFormState,
  form: FormData,
): Promise<CrmFormState> {
  try {
    await updateContactOptOut(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof AccessDenied) return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Could not update opt-out.' };
    return { error: 'Could not update communication preference.' };
  }
  revalidatePath(`/app/${slug}/crm`);
  revalidatePath(`/app/${slug}/follow-ups`);
  return { success: true };
}
