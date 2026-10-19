'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { ConversationUnavailable } from './input';
import { askTestQuestion } from './service';

export interface TestChatState {
  success?: boolean;
  error?: string;
}
export async function testEmployee(
  slug: string,
  _state: TestChatState,
  form: FormData,
): Promise<TestChatState> {
  try {
    await askTestQuestion(slug, Object.fromEntries(form));
  } catch (error) {
    revalidatePath(`/app/${slug}/test-chat`);
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your question.' };
    if (error instanceof ConversationUnavailable) return { error: error.message };
    return { error: 'The test reply could not be completed. Check your access and try again.' };
  }
  revalidatePath(`/app/${slug}/test-chat`);
  return { success: true };
}
