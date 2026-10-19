'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { QuotationUnavailable } from './input';
import { approveQuotationDraft, createQuotationDraft, priceQuotationDraft } from './service';

export interface QuotationFormState {
  success?: boolean;
  error?: string;
}

export async function createQuotationAction(
  slug: string,
  _state: QuotationFormState,
  form: FormData,
): Promise<QuotationFormState> {
  try {
    await createQuotationDraft(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof QuotationUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the quotation details.' };
    if (error instanceof Error && error.message.includes('Price precision'))
      return { error: error.message };
    return { error: 'Could not create the quotation draft.' };
  }
  revalidatePath(`/app/${slug}/quotations`);
  revalidatePath(`/app/${slug}/crm/pipeline`);
  return { success: true };
}

export async function approveQuotationAction(
  slug: string,
  _state: QuotationFormState,
  form: FormData,
): Promise<QuotationFormState> {
  try {
    await approveQuotationDraft(slug, {
      quotationId: String(form.get('quotationId') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof QuotationUnavailable)
      return { error: error.message };
    return { error: 'Could not approve the quotation.' };
  }
  revalidatePath(`/app/${slug}/quotations`);
  return { success: true };
}

export async function priceQuotationAction(
  slug: string,
  _state: QuotationFormState,
  form: FormData,
): Promise<QuotationFormState> {
  try {
    await priceQuotationDraft(slug, Object.fromEntries(form));
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof QuotationUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the pricing details.' };
    if (error instanceof Error && error.message.includes('Price precision'))
      return { error: error.message };
    return { error: 'Could not update quotation pricing.' };
  }
  revalidatePath(`/app/${slug}/quotations`);
  return { success: true };
}
