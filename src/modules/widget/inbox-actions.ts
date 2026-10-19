'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AccessDenied } from '@/modules/organizations/policy';
import { WidgetUnavailable } from './input';
import {
  assignInboxConversation,
  resumeInboxAi,
  sendHumanInboxReply,
  takeOverInboxConversation,
} from './service';

export interface InboxActionState {
  success?: boolean;
  error?: string;
}

export async function takeOverConversationAction(
  slug: string,
  conversationId: string,
  _state: InboxActionState,
  form: FormData,
): Promise<InboxActionState> {
  void form;
  try {
    await takeOverInboxConversation(slug, conversationId);
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof WidgetUnavailable)
      return { error: error.message };
    return { error: 'Could not take over this conversation.' };
  }
  revalidatePath(`/app/${slug}/inbox`);
  revalidatePath(`/app/${slug}/inbox/${conversationId}`);
  return { success: true };
}

export async function resumeAiAction(
  slug: string,
  conversationId: string,
  _state: InboxActionState,
  form: FormData,
): Promise<InboxActionState> {
  void form;
  try {
    await resumeInboxAi(slug, conversationId);
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof WidgetUnavailable)
      return { error: error.message };
    return { error: 'Could not resume the AI employee.' };
  }
  revalidatePath(`/app/${slug}/inbox`);
  revalidatePath(`/app/${slug}/inbox/${conversationId}`);
  return { success: true };
}

export async function sendHumanReplyAction(
  slug: string,
  conversationId: string,
  _state: InboxActionState,
  form: FormData,
): Promise<InboxActionState> {
  try {
    await sendHumanInboxReply(slug, conversationId, {
      content: String(form.get('content') ?? ''),
    });
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof WidgetUnavailable)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? 'Check your reply.' };
    return { error: 'Could not send the reply.' };
  }
  revalidatePath(`/app/${slug}/inbox`);
  revalidatePath(`/app/${slug}/inbox/${conversationId}`);
  return { success: true };
}

export async function assignConversationAction(
  slug: string,
  conversationId: string,
  _state: InboxActionState,
  form: FormData,
): Promise<InboxActionState> {
  try {
    await assignInboxConversation(slug, conversationId, String(form.get('assigneeId') ?? ''));
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof WidgetUnavailable)
      return { error: error.message };
    return { error: 'Could not assign this conversation.' };
  }
  revalidatePath(`/app/${slug}/inbox`);
  revalidatePath(`/app/${slug}/inbox/${conversationId}`);
  return { success: true };
}
