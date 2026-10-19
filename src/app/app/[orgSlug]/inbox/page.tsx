import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { getInbox } from '@/modules/widget/service';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getInbox(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Inbox</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Consented website leads and visitor conversations. Open a conversation to take over from
        the AI employee and reply as your team.
      </p>
      <section className="mt-8 space-y-4" aria-label="Qualified leads">
        <h2 className="text-lg font-semibold">Leads</h2>
        {!data.leads.length && (
          <p className="text-sm text-muted-foreground">
            No consented leads yet. When a website visitor shares contact details, they appear here.
          </p>
        )}
        {data.leads.map((lead) => (
          <article key={lead.id} className="space-y-2 rounded-xl border border-input p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium">{lead.name}</h3>
              <time className="text-xs text-muted-foreground" dateTime={lead.createdAt}>
                {new Intl.DateTimeFormat(data.workspace.locale, {
                  timeZone: data.workspace.timeZone,
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(lead.createdAt))}
              </time>
            </div>
            <p className="text-sm">{lead.email}</p>
            {lead.phone && <p className="text-sm text-muted-foreground">{lead.phone}</p>}
            {lead.latestVisitorMessage && (
              <p className="text-sm text-muted-foreground">
                Latest visitor message: {lead.latestVisitorMessage}
              </p>
            )}
            <Link
              href={`/app/${orgSlug}/inbox/${lead.conversationId}`}
              className="inline-block text-sm font-medium text-primary"
            >
              Open conversation
            </Link>
          </article>
        ))}
      </section>
      <section className="mt-10 space-y-4" aria-label="Recent website conversations">
        <h2 className="text-lg font-semibold">Recent conversations</h2>
        {!data.conversations.length && (
          <p className="text-sm text-muted-foreground">
            No website conversations yet. Enabled installs on allowed origins will show up here.
          </p>
        )}
        {data.conversations.map((conversation) => (
          <article key={conversation.id} className="space-y-2 rounded-xl border border-input p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {conversation.controlMode === 'human' ? 'Human control' : 'AI control'}
                {conversation.hasLead ? ' · Lead captured' : ''}
                {conversation.needsHuman ? ' · Needs human' : ''}
              </p>
              <time className="text-xs text-muted-foreground" dateTime={conversation.updatedAt}>
                {new Intl.DateTimeFormat(data.workspace.locale, {
                  timeZone: data.workspace.timeZone,
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(conversation.updatedAt))}
              </time>
            </div>
            {conversation.latestVisitorMessage && (
              <p className="text-sm">Visitor: {conversation.latestVisitorMessage}</p>
            )}
            {conversation.latestEmployeeMessage && (
              <p className="text-sm text-muted-foreground">
                Latest reply: {conversation.latestEmployeeMessage}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{conversation.messageCount} messages</p>
              <Link
                href={`/app/${orgSlug}/inbox/${conversation.id}`}
                className="text-sm font-medium text-primary"
              >
                Open thread
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
