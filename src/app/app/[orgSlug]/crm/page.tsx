import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getCrmContacts } from '@/modules/crm/service';
import { CrmContactForm } from '@/components/crm-contact-form';
import { ContactOptOutButton } from '@/components/contact-opt-out-button';

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
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Contacts</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            People captured from website chats or added by your team. No fabricated records.
          </p>
        </div>
        <Link href={`/app/${orgSlug}/crm/pipeline`} className="text-sm font-medium text-primary">
          Open pipeline →
        </Link>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <section className="space-y-3" aria-label="Contacts">
          {!data.contacts.length && (
            <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
              No contacts yet. Consented website leads appear here automatically, or add one
              manually.
            </p>
          )}
          {data.contacts.map((contact) => (
            <article key={contact.id} className="rounded-xl border border-input p-5">
              <h2 className="font-medium">{contact.name}</h2>
              <p className="mt-1 text-sm">{contact.email}</p>
              {contact.phone && (
                <p className="mt-1 text-sm text-muted-foreground">{contact.phone}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Source: {contact.source === 'website_widget' ? 'Website widget' : 'Manual'}
                {contact.communicationOptOut ? ' · Opted out of automated follow-ups' : ''}
              </p>
              <ContactOptOutButton
                slug={orgSlug}
                contactId={contact.id}
                optedOut={contact.communicationOptOut}
                editable={editable}
              />
            </article>
          ))}
        </section>
        <CrmContactForm slug={orgSlug} editable={editable} />
      </div>
    </main>
  );
}
