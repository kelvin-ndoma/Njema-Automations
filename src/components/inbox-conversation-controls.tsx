'use client';
import { useActionState } from 'react';
import {
  resumeAiAction,
  sendHumanReplyAction,
  takeOverConversationAction,
} from '@/modules/widget/inbox-actions';
import { Button } from './ui/button';

export function InboxConversationControls({
  slug,
  conversationId,
  controlMode,
  readOnly,
}: {
  slug: string;
  conversationId: string;
  controlMode: 'ai' | 'human';
  readOnly: boolean;
}) {
  const [takeOverState, takeOver, takeOverPending] = useActionState(
    takeOverConversationAction.bind(null, slug, conversationId),
    {},
  );
  const [resumeState, resume, resumePending] = useActionState(
    resumeAiAction.bind(null, slug, conversationId),
    {},
  );
  const [replyState, reply, replyPending] = useActionState(
    sendHumanReplyAction.bind(null, slug, conversationId),
    {},
  );
  if (readOnly) {
    return (
      <p className="text-sm text-muted-foreground">
        Support mode is read-only. Exit support mode to collaborate on conversations.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {controlMode === 'ai' ? (
          <form action={takeOver}>
            <Button type="submit" disabled={takeOverPending}>
              {takeOverPending ? 'Taking over…' : 'Take over from AI'}
            </Button>
          </form>
        ) : (
          <form action={resume}>
            <Button type="submit" variant="outline" disabled={resumePending}>
              {resumePending ? 'Resuming…' : 'Resume AI employee'}
            </Button>
          </form>
        )}
      </div>
      {(takeOverState.error || resumeState.error) && (
        <p role="alert" className="text-sm text-red-700">
          {takeOverState.error || resumeState.error}
        </p>
      )}
      {controlMode === 'human' && (
        <form action={reply} className="space-y-3">
          <label htmlFor="human-reply" className="block text-sm font-medium">
            Reply as your team
          </label>
          <textarea
            id="human-reply"
            name="content"
            required
            minLength={1}
            maxLength={4000}
            rows={4}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm"
            placeholder="Write a reply the visitor will see in the website chat."
          />
          <Button type="submit" disabled={replyPending}>
            {replyPending ? 'Sending…' : 'Send reply'}
          </Button>
          {replyState.error && (
            <p role="alert" className="text-sm text-red-700">
              {replyState.error}
            </p>
          )}
          {replyState.success && (
            <p role="status" className="text-sm text-primary">
              Reply sent.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
