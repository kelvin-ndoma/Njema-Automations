import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { getInbox } from '@/modules/widget/service';

type Filter = 'all' | 'needs' | 'leads';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const filter: Filter =
    query.filter === 'needs' || query.filter === 'leads' ? query.filter : 'all';

  let data;
  try {
    data = await getInbox(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const leadByConversation = new Map(
    data.leads.map((lead) => [lead.conversationId, lead] as const),
  );

  const threads = data.conversations
    .map((conversation) => {
      const lead = leadByConversation.get(conversation.id);
      return {
        id: conversation.id,
        title: lead?.name ?? 'Website visitor',
        subtitle: lead?.email ?? conversation.latestVisitorMessage ?? 'No messages yet',
        preview:
          conversation.latestVisitorMessage ??
          conversation.latestEmployeeMessage ??
          'Conversation started',
        at: conversation.updatedAt,
        needsHuman: conversation.needsHuman,
        hasLead: conversation.hasLead || !!lead,
        controlMode: conversation.controlMode,
        messageCount: conversation.messageCount,
      };
    })
    .sort((a, b) => {
      if (a.needsHuman !== b.needsHuman) return a.needsHuman ? -1 : 1;
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });

  const visible = threads.filter((thread) => {
    if (filter === 'needs') return thread.needsHuman;
    if (filter === 'leads') return thread.hasLead;
    return true;
  });

  const needsCount = threads.filter((thread) => thread.needsHuman).length;
  const leadsCount = threads.filter((thread) => thread.hasLead).length;

  const formatWhen = (value: string) =>
    new Intl.DateTimeFormat(data.workspace.locale, {
      timeZone: data.workspace.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  const tabs: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: threads.length },
    { id: 'needs', label: 'Needs you', count: needsCount },
    { id: 'leads', label: 'With lead', count: leadsCount },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Website chats and consented leads. Open a thread to take over from the AI employee or
          reply as your team.
        </p>
      </header>

      <nav aria-label="Inbox filters" className="mt-8 flex flex-wrap gap-2 border-b border-input pb-3">
        {tabs.map((tab) => {
          const active = filter === tab.id;
          const href =
            tab.id === 'all'
              ? `/app/${orgSlug}/inbox`
              : `/app/${orgSlug}/inbox?filter=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-[#e0e9df] text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
              <span className="ml-2 tabular-nums text-xs opacity-70">{tab.count}</span>
            </Link>
          );
        })}
      </nav>

      <section aria-label="Conversations" className="mt-2">
        {!visible.length ? (
          <div className="mt-6 rounded-xl border border-dashed border-input px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === 'needs'
                ? 'Nothing needs a human right now.'
                : filter === 'leads'
                  ? 'No conversations with a captured lead yet.'
                  : 'No website conversations yet. When visitors chat on an allowed origin, threads appear here.'}
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((thread) => (
              <li key={thread.id} className="border-b border-input last:border-0">
                <Link
                  href={`/app/${orgSlug}/inbox/${thread.id}`}
                  className="group flex items-start gap-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                      thread.needsHuman ? 'bg-amber-500' : 'bg-primary/35'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold group-hover:text-primary">
                        {thread.title}
                      </p>
                      <time
                        className="shrink-0 text-xs text-muted-foreground"
                        dateTime={thread.at}
                      >
                        {formatWhen(thread.at)}
                      </time>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{thread.subtitle}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {thread.preview}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                      <span>{thread.controlMode === 'human' ? 'Team' : 'AI'}</span>
                      {thread.hasLead && <span>· Lead</span>}
                      {thread.needsHuman && <span className="text-amber-700">· Needs you</span>}
                      <span>· {thread.messageCount} messages</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
