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
  return (
    <main className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <Link href={`/app/${orgSlug}/inbox`} className="text-sm text-primary">
        ← Inbox
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Conversation</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {conversation.controlMode === 'human'
          ? 'Human team control — the AI employee cannot publish until resumed.'
          : 'AI employee is responding. Take over to reply as your team.'}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <dl className="grid gap-3 rounded-xl border border-input p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Control</dt>
              <dd className="mt-1 capitalize">{conversation.controlMode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1">
                {conversation.hasLead ? 'Lead captured' : 'Open'}
                {conversation.needsHuman ? ' · Needs human' : ''}
                {conversation.requestContact ? ' · Contact requested' : ''}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Origin</dt>
              <dd className="mt-1 break-all">{conversation.origin}</dd>
            </div>
          </dl>
          {conversation.qualificationNotes && (
            <section className="mt-6 rounded-xl border border-input p-5">
              <h2 className="text-sm font-semibold">Qualification notes</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {conversation.qualificationNotes}
              </p>
            </section>
          )}
          <section className="mt-8 space-y-4" aria-label="Messages">
            <h2 className="text-lg font-semibold">Thread</h2>
            {!conversation.messages.length && (
              <p className="text-sm text-muted-foreground">No completed messages yet.</p>
            )}
            {conversation.messages.map((message) => (
              <article key={message.id} className="rounded-xl border border-input p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {message.role === 'visitor'
                      ? 'Visitor'
                      : message.role === 'human'
                        ? 'Team'
                        : 'AI employee'}
                  </p>
                  <time className="text-xs text-muted-foreground" dateTime={message.createdAt}>
                    {new Intl.DateTimeFormat(workspace.locale, {
                      timeZone: workspace.timeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(message.createdAt))}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-6">{message.content}</p>
              </article>
            ))}
          </section>
          <section className="mt-8 rounded-xl border border-input p-5">
            <h2 className="text-sm font-semibold">Collaborate</h2>
            <div className="mt-4">
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
        </div>
        <aside className="space-y-4" aria-label="Sales context">
          <section className="rounded-xl border border-input p-5">
            <h2 className="text-sm font-semibold">Sales context</h2>
            {!sales?.contact && !sales?.opportunity ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No CRM records yet. Consented leads create contacts and opportunities.
              </p>
            ) : (
              <dl className="mt-3 space-y-3 text-sm">
                {sales.contact && (
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="mt-1">
                      <Link className="text-primary" href={`/app/${orgSlug}/crm`}>
                        {sales.contact.name}
                      </Link>
                      <span className="block text-muted-foreground">{sales.contact.email}</span>
                    </dd>
                  </div>
                )}
                {sales.opportunity && (
                  <div>
                    <dt className="text-muted-foreground">Opportunity</dt>
                    <dd className="mt-1">
                      <Link className="text-primary" href={`/app/${orgSlug}/crm/pipeline`}>
                        {sales.opportunity.title}
                      </Link>
                      <span className="mt-1 block capitalize text-muted-foreground">
                        {sales.opportunity.stageKey} · {sales.opportunity.status}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>
          <section className="rounded-xl border border-input p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Quotations</h2>
              <Link href={`/app/${orgSlug}/quotations`} className="text-xs text-primary">
                Open
              </Link>
            </div>
            {!sales?.quotations.length ? (
              <p className="mt-3 text-sm text-muted-foreground">None linked yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {sales.quotations.map((quote) => (
                  <li key={quote.id}>
                    {quote.title}{' '}
                    <span className="capitalize text-muted-foreground">({quote.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl border border-input p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Appointments</h2>
              <Link href={`/app/${orgSlug}/appointments`} className="text-xs text-primary">
                Open
              </Link>
            </div>
            {!sales?.appointments.length ? (
              <p className="mt-3 text-sm text-muted-foreground">None linked yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {sales.appointments.map((appt) => (
                  <li key={appt.id}>
                    {appt.title}{' '}
                    <span className="capitalize text-muted-foreground">({appt.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl border border-input p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Follow-ups</h2>
              <Link href={`/app/${orgSlug}/follow-ups`} className="text-xs text-primary">
                Open
              </Link>
            </div>
            {!sales?.followUps.length ? (
              <p className="mt-3 text-sm text-muted-foreground">None scheduled.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {sales.followUps.map((job) => (
                  <li key={job.id}>
                    <span className="capitalize">{job.status}</span>
                    <span className="block text-xs text-muted-foreground">{job.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!!sales?.activities.length && (
            <section className="rounded-xl border border-input p-5">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {sales.activities.map((activity) => (
                  <li key={activity.id}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {activity.type.replace('_', ' ')}
                    </p>
                    <p className="mt-1">{activity.body}</p>
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
