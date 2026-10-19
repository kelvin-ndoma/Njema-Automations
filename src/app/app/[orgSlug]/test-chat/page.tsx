import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { getTestChat } from '@/modules/conversations/service';
import { TestChatForm } from '@/components/test-chat-form';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getTestChat(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Test your sales employee</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Ask a standalone question using your approved knowledge. This private test does not contact
        customers or install a website widget.
      </p>
      {!data.employee && (
        <p className="mt-4 text-sm">
          <Link href={`/app/${orgSlug}/employee`} className="text-primary underline">
            Configure your employee first.
          </Link>
        </p>
      )}
      {!data.available && (
        <p role="status" className="mt-4 rounded-lg bg-muted p-4 text-sm">
          Test chat needs an OpenAI connection. Ask your platform administrator to configure it.
        </p>
      )}
      <TestChatForm
        slug={orgSlug}
        requestId={randomUUID()}
        enabled={!!data.employee && data.available}
      />
      <section className="mt-8 space-y-4" aria-label="Recent test replies">
        <h2 className="text-lg font-semibold">Recent tests</h2>
        {!data.conversations.length && (
          <p className="text-sm text-muted-foreground">
            No test questions yet. Your saved replies will appear here.
          </p>
        )}
        {data.conversations.map((conversation) => (
          <article key={conversation.id} className="space-y-3 rounded-xl border border-input p-5">
            <p className="whitespace-pre-wrap break-words text-sm">
              <strong>You:</strong> {conversation.question}
            </p>
            {conversation.status === 'completed' ? (
              <>
                <p className="whitespace-pre-wrap break-words text-sm">
                  <strong>{data.employee?.name ?? 'Employee'}:</strong> {conversation.answer}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conversation.grounded
                    ? 'Supported by approved knowledge'
                    : 'Information unavailable — configured fallback'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {conversation.status === 'failed'
                  ? 'Reply failed. No AI answer was saved.'
                  : 'Reply pending. Reload to check its status.'}
              </p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
