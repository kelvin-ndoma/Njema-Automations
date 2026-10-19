import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { getWorkspaceAnalytics } from '@/modules/analytics/service';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getWorkspaceAnalytics(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const { metrics, workspace } = data;
  const cards = [
    { label: 'Conversations', value: metrics.conversationCount },
    { label: 'Needs human', value: metrics.humanControlCount },
    { label: 'Qualified leads', value: metrics.leadCount },
    { label: 'Contacts', value: metrics.contactCount },
    { label: 'Open opportunities', value: metrics.openOpportunities },
    { label: 'Won', value: metrics.wonOpportunities },
    { label: 'Lost', value: metrics.lostOpportunities },
    { label: 'Draft quotations', value: metrics.draftQuotations },
    { label: 'Approved quotations', value: metrics.approvedQuotations },
    { label: 'Requested appointments', value: metrics.requestedAppointments },
    { label: 'Confirmed appointments', value: metrics.confirmedAppointments },
    { label: 'Pending follow-ups', value: metrics.pendingFollowUps },
    { label: 'Completed follow-ups', value: metrics.completedFollowUps },
  ];
  return (
    <main className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Outcomes</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Counts from persisted workspace records only. No estimated revenue or fabricated
        conversion rates.
      </p>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Sales metrics">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-input p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{card.value}</p>
          </article>
        ))}
      </section>
      <section className="mt-10" aria-label="Recent activity">
        <h2 className="text-sm font-semibold">Recent CRM activity</h2>
        {!data.recentActivities.length ? (
          <p className="mt-4 rounded-xl border border-input p-5 text-sm text-muted-foreground">
            No CRM activity recorded yet for this organization.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.recentActivities.map((row) => (
              <li key={row.id} className="rounded-xl border border-input p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {row.type.replace('_', ' ')}
                  </p>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={row.createdAt}
                  >
                    {new Intl.DateTimeFormat(workspace.locale, {
                      timeZone: workspace.timeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(row.createdAt))}
                  </time>
                </div>
                <p className="mt-2 text-sm">{row.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
