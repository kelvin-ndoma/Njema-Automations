import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getCrmContact } from '@/modules/crm/service';
import { CrmStageForm } from '@/components/crm-stage-form';
import { ContactOptOutButton } from '@/components/contact-opt-out-button';
import { CrmSubnav } from '@/components/crm-subnav';

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string; contactId: string }>;
}) {
  const { orgSlug, contactId } = await params;
  let data;
  try {
    data = await getCrmContact(orgSlug, contactId);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable =
    can(data.workspace.role, 'organization:update') &&
    !data.workspace.readOnly &&
    !data.workspace.supportMode;
  const formatWhen = (value: string, withTime = true) =>
    new Intl.DateTimeFormat(data.workspace.locale, {
      timeZone: data.workspace.timeZone,
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' as const } : {}),
    }).format(new Date(value));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <Link href={`/app/${orgSlug}/crm`} className="text-sm text-primary">
        ← All contacts
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{data.contact.name}</h1>
          <p className="mt-2 text-sm">{data.contact.email}</p>
          {data.contact.phone && (
            <p className="mt-1 text-sm text-muted-foreground">{data.contact.phone}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Source: {data.contact.source === 'website_widget' ? 'Website widget' : 'Manual'}
            {' · Created '}
            {formatWhen(data.contact.createdAt)}
            {' · Updated '}
            {formatWhen(data.contact.updatedAt)}
          </p>
        </div>
        <ContactOptOutButton
          slug={orgSlug}
          contactId={data.contact.id}
          optedOut={data.contact.communicationOptOut}
          editable={editable}
        />
      </div>
      <CrmSubnav slug={orgSlug} active="contact" />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="space-y-3" aria-label="Opportunities">
          <h2 className="text-lg font-semibold">Opportunities</h2>
          {!data.opportunities.length && (
            <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
              No opportunities linked to this contact.
            </p>
          )}
          {data.opportunities.map((opportunity) => (
            <article key={opportunity.id} className="space-y-3 rounded-xl border border-input p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{opportunity.title}</h3>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {opportunity.status}
                </span>
              </div>
              <CrmStageForm
                slug={orgSlug}
                opportunityId={opportunity.id}
                stages={data.pipeline.stages}
                currentStage={opportunity.stageKey}
                editable={editable}
              />
              <div className="flex flex-wrap gap-3 text-sm">
                <Link href={`/app/${orgSlug}/crm/pipeline`} className="font-medium text-primary">
                  View on pipeline
                </Link>
                {opportunity.conversationId && (
                  <Link
                    href={`/app/${orgSlug}/inbox/${opportunity.conversationId}`}
                    className="font-medium text-primary"
                  >
                    Open conversation
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3" aria-label="Activity">
          <h2 className="text-lg font-semibold">Activity</h2>
          {!data.activities.length && (
            <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
              No activity recorded for this contact.
            </p>
          )}
          {data.activities.map((item) => (
            <article key={item.id} className="rounded-xl border border-input px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium capitalize">{item.type.replaceAll('_', ' ')}</p>
                <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>
                  {formatWhen(item.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <section className="space-y-3" aria-label="Quotations">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Quotations</h2>
            <Link href={`/app/${orgSlug}/quotations`} className="text-xs font-medium text-primary">
              All quotes
            </Link>
          </div>
          {!data.quotations.length && (
            <p className="rounded-xl border border-input p-4 text-sm text-muted-foreground">
              None yet.
            </p>
          )}
          {data.quotations.map((row) => (
            <article key={row.id} className="rounded-xl border border-input p-4 text-sm">
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 capitalize text-muted-foreground">{row.status}</p>
            </article>
          ))}
        </section>

        <section className="space-y-3" aria-label="Appointments">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Appointments</h2>
            <Link href={`/app/${orgSlug}/appointments`} className="text-xs font-medium text-primary">
              All appointments
            </Link>
          </div>
          {!data.appointments.length && (
            <p className="rounded-xl border border-input p-4 text-sm text-muted-foreground">
              None yet.
            </p>
          )}
          {data.appointments.map((row) => (
            <article key={row.id} className="rounded-xl border border-input p-4 text-sm">
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 capitalize text-muted-foreground">{row.status}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWhen(row.requestedStartAt)} ({row.timeZone})
              </p>
            </article>
          ))}
        </section>

        <section className="space-y-3" aria-label="Follow-ups">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Follow-ups</h2>
            <Link href={`/app/${orgSlug}/follow-ups`} className="text-xs font-medium text-primary">
              All follow-ups
            </Link>
          </div>
          {!data.followUps.length && (
            <p className="rounded-xl border border-input p-4 text-sm text-muted-foreground">
              None yet.
            </p>
          )}
          {data.followUps.map((row) => (
            <article key={row.id} className="rounded-xl border border-input p-4 text-sm">
              <p className="font-medium">{row.reason}</p>
              <p className="mt-1 capitalize text-muted-foreground">{row.status}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scheduled {formatWhen(row.scheduledAt)}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
