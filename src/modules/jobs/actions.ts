'use server';
import { revalidatePath } from 'next/cache';
import { AccessDenied } from '@/modules/organizations/policy';
import { runDueFollowUps } from './service';

export interface FollowUpActionState {
  success?: boolean;
  processed?: number;
  error?: string;
}

export async function processFollowUpsAction(
  slug: string,
  _state: FollowUpActionState,
  form: FormData,
): Promise<FollowUpActionState> {
  void form;
  try {
    const result = await runDueFollowUps(slug);
    revalidatePath(`/app/${slug}`);
    revalidatePath(`/app/${slug}/crm`);
    revalidatePath(`/app/${slug}/follow-ups`);
    return { success: true, processed: result.processed };
  } catch (error) {
    if (error instanceof AccessDenied) return { error: error.message };
    return { error: 'Could not process due follow-ups.' };
  }
}
