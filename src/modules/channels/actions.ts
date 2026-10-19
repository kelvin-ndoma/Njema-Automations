'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { ChannelUnavailable } from './input';
import { saveChannel } from './service';

export interface ChannelFormState {
  success?: boolean;
  error?: string;
  activationBlocked?: boolean;
}

export async function saveChannelAction(
  slug: string,
  provider: 'email' | 'whatsapp',
  _state: ChannelFormState,
  form: FormData,
): Promise<ChannelFormState> {
  try {
    const result = await saveChannel(slug, {
      ...Object.fromEntries(form),
      provider,
    });
    revalidatePath(`/app/${slug}/channels`);
    return { success: true, activationBlocked: result.activationBlocked };
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof ChannelUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check the channel configuration.' };
    return { error: 'Could not save channel configuration.' };
  }
}
