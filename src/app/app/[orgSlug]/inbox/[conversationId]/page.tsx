import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { getInboxConversation } from '@/modules/widget/service';
import { InboxConversationControls } from '@/components/inbox-conversation-controls';
import { InboxAssignForm } from '@/components/inbox-assign-form';

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string; conversationId: string }>;
}) {
  const { orgSlug, conversationId } = await params;
  let data;
  try {
    data = await getInboxConversation(orgSlug, conversationId);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  if (!data.conversation) notFound();
  const { workspace, conversation } = data;
  const readOnly = !!(workspace.supportMode || workspace.readOnly);
  const sales = conversation.sales;
  const contactName = sales?.contact?.name;
  const formatWhen = (value: string) =>
    new Intl.DateTimeFormat(workspace.locale, {
      timeZone: workspace.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href={`/app/${orgSlug}/inbox`} className="text-sm font-medium text-primary">
          ← Inbox
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-input bg-background lg:grid lg:grid-cols-[minmax(0,1.6fr)_300px]">
        <section className="flex min-h-[70vh] flex-col">
          <header className="border-b border-input bg-[#f7f8f4] px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {contactName ?? 'Website visitor'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sales?.contact?.email ?? conversation.origin}
                </p>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{conversation.controlMode === 'human' ? 'Team in control' : 'AI responding'}</span>
                  {conversation.hasLead && <span>Lead captured</span>}
                  {conversation.needsHuman && (
                    <span className="font-medium text-amber-700">Needs you</span>
                  )}
                  {conversation.requestContact && <span>Contact requested</span>}
                </p>
              </div>
            </div>
          </header>

          <div
            className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcf9] px-4 py-5 sm:px-6"
            aria-label="Messages"
          >
            {!conversation.messages.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No messages in this thread yet.
              </p>
            )}
            {conversation.messages.map((message) => {
              const fromVisitor = message.role === 'visitor';
              const fromTeam = message.role === 'human';
              return (
                <article
                  key={message.id}
                  className={`flex ${fromVisitor ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${
                      fromVisitor
                        ? 'rounded-bl-md border border-input bg-white text-foreground'
                        : fromTeam
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-br-md bg-[#e0e9df] text-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p
                        className={`text-[11px] font-medium uppercase tracking-[0.08em] ${
                          fromTeam ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}
                      >
                        {fromVisitor ? 'Visitor' : fromTeam ? 'Team' : 'AI employee'}
                      </p>
                      <time
                        className={`text-[11px] ${
                          fromTeam ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                        dateTime={message.createdAt}
                      >
                        {formatWhen(message.createdAt)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="border-t border-input bg-background px-5 py-4 sm:px-6">
            <InboxConversationControls
              slug={orgSlug}
              conversationId={conversation.id}
              controlMode={conversation.controlMode}
              readOnly={readOnly}
            />
            <InboxAssignForm
              slug={orgSlug}
              conversationId={conversation.id}
              assigneeId={conversation.assigneeId}
              teamMembers={conversation.teamMembers}
              readOnly={readOnly}
            />
          </div>
        </section>

        <aside
          className="space-y-6 border-t border-input bg-[#f3f5f0] p-5 lg:border-l lg:border-t-0"
          aria-label="Sales context"
        >
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sales context
            </h2>
            {!sales?.contact && !sales?.opportunity ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No CRM records yet. Consented leads create a contact and opportunity.
              </p>
            ) : (
              <dl className="mt-4 space-y-4 text-sm">
                {sales.contact && (
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="mt-1">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/app/${orgSlug}/crm/${sales.contact.id}`}
                      >
                        {sales.contact.name}
                      </Link>
                      <span className="mt-0.5 block text-muted-foreground">
                        {sales.contact.email}
                      </span>
                    </dd>
                  </div>
                )}
                {sales.opportunity && (
                  <div>
                    <dt className="text-muted-foreground">Opportunity</dt>
                    <dd className="mt-1">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/app/${orgSlug}/crm/pipeline`}
                      >
                        {sales.opportunity.title}
                      </Link>
                      <span className="mt-0.5 block capitalize text-muted-foreground">
                        {sales.opportunity.stageKey} · {sales.opportunity.status}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          {conversation.qualificationNotes && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Qualification
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {conversation.qualificationNotes}
              </p>
            </section>
          )}

          <RelatedList
            title="Quotations"
            href={`/app/${orgSlug}/quotations`}
            empty="None linked"
            items={(sales?.quotations ?? []).map((quote) => ({
              id: quote.id,
              label: quote.title,
              meta: quote.status,
            }))}
          />
          <RelatedList
            title="Appointments"
            href={`/app/${orgSlug}/appointments`}
            empty="None linked"
            items={(sales?.appointments ?? []).map((appt) => ({
              id: appt.id,
              label: appt.title,
              meta: appt.status,
            }))}
          />
          <RelatedList
            title="Follow-ups"
            href={`/app/${orgSlug}/follow-ups`}
            empty="None scheduled"
            items={(sales?.followUps ?? []).map((job) => ({
              id: job.id,
              label: job.reason,
              meta: job.status,
            }))}
          />

          {!!sales?.activities.length && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Activity
              </h2>
              <ul className="mt-3 space-y-3">
                {sales.activities.map((activity) => (
                  <li key={activity.id} className="text-sm">
                    <p className="text-xs capitalize text-muted-foreground">
                      {activity.type.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 leading-5">{activity.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function RelatedList({
  title,
  href,
  empty,
  items,
}: {
  title: string;
  href: string;
  empty: string;
  items: Array<{ id: string; label: string; meta: string }>;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h2>
        <Link href={href} className="text-xs font-medium text-primary">
          Open
        </Link>
      </div>
      {!items.length ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <p className="leading-5">{item.label}</p>
              <p className="capitalize text-muted-foreground">{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
