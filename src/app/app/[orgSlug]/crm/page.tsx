import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getCrmContacts } from '@/modules/crm/service';
import { CrmContactForm } from '@/components/crm-contact-form';
import { ContactOptOutButton } from '@/components/contact-opt-out-button';
import { CrmSubnav } from '@/components/crm-subnav';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getCrmContacts(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable =
    can(data.workspace.role, 'organization:update') &&
    !data.workspace.readOnly &&
    !data.workspace.supportMode;
  const formatWhen = (value: string) =>
    new Intl.DateTimeFormat(data.workspace.locale, {
      timeZone: data.workspace.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">CRM</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Contacts, opportunities, and recent activity from consented website leads and team
            entries. Counts reflect stored records only.
          </p>
        </div>
        <Link
          href={`/app/${orgSlug}/crm/pipeline`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Open pipeline board
        </Link>
      </div>
      <CrmSubnav slug={orgSlug} active="contacts" />

      <section
        aria-label="Pipeline summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {data.pipeline.stages.map((stage) => (
          <div key={stage.key} className="rounded-xl border border-input bg-[#f7f8f4] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {stage.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{stage.count}</p>
          </div>
        ))}
      </section>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{data.totals.contacts}</strong> contacts
        </span>
        <span>
          <strong className="text-foreground">{data.totals.opportunities}</strong> opportunities
        </span>
        <span>
          <strong className="text-foreground">{data.totals.open}</strong> open
        </span>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          <section className="space-y-3" aria-label="Contacts">
            <h2 className="text-lg font-semibold">Contacts</h2>
            {!data.contacts.length && (
              <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
                No contacts yet. Consented website leads appear here automatically, or add one
                manually.
              </p>
            )}
            {data.contacts.map((contact) => (
              <article key={contact.id} className="rounded-xl border border-input p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">
                      <Link
                        href={`/app/${orgSlug}/crm/${contact.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {contact.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm">{contact.email}</p>
                    {contact.phone && (
                      <p className="mt-1 text-sm text-muted-foreground">{contact.phone}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Source: {contact.source === 'website_widget' ? 'Website widget' : 'Manual'}
                      {contact.communicationOptOut ? ' · Opted out of automated follow-ups' : ''}
                      {' · Updated '}
                      {formatWhen(contact.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/app/${orgSlug}/crm/${contact.id}`}
                    className="text-sm font-medium text-primary"
                  >
                    View record →
                  </Link>
                </div>
                {contact.opportunities.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-input pt-4">
                    {contact.opportunities.map((opportunity) => (
                      <li
                        key={opportunity.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>{opportunity.title}</span>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                          {opportunity.stageKey} · {opportunity.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <ContactOptOutButton
                  slug={orgSlug}
                  contactId={contact.id}
                  optedOut={contact.communicationOptOut}
                  editable={editable}
                />
              </article>
            ))}
          </section>

          <section className="space-y-3" aria-label="Recent activity">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            {!data.recentActivity.length && (
              <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
                No CRM activity recorded yet.
              </p>
            )}
            {data.recentActivity.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-input px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium capitalize">{item.type.replaceAll('_', ' ')}</p>
                  <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>
                    {formatWhen(item.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-muted-foreground">{item.body}</p>
                {item.contactId && item.contactName && (
                  <Link
                    href={`/app/${orgSlug}/crm/${item.contactId}`}
                    className="mt-2 inline-block text-xs font-medium text-primary"
                  >
                    {item.contactName}
                  </Link>
                )}
              </article>
            ))}
          </section>
        </div>
        <CrmContactForm slug={orgSlug} editable={editable} />
      </div>
    </main>
  );
}
