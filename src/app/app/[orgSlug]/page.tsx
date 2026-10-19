import { ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AccessDenied } from '@/modules/organizations/policy';
import { getWorkspaceHome } from '@/modules/organizations/overview';
import { Button } from '@/components/ui/button';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let home;
  try {
    home = await getWorkspaceHome(orgSlug);
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
  const { workspace: org, viewerName } = home;

  const employeeReady = !!home.employee;
  const websiteReady = !!(home.widget?.enabled && home.widget.originCount > 0);
  const setupComplete = employeeReady && websiteReady;

  const primary = !employeeReady
    ? {
        title: 'Set up your sales employee',
        body: 'Teach it what you sell, how to qualify, and when to hand off to your team.',
        href: `/app/${org.slug}/employee`,
        cta: 'Configure employee',
      }
    : !websiteReady
      ? {
          title: 'Connect your website',
          body: 'Allow your site origins so visitors can talk to the employee and leave contact details.',
          href: `/app/${org.slug}/widget`,
          cta: 'Open website installation',
        }
      : home.needsHumanCount > 0
        ? {
            title: 'Conversations waiting on you',
            body: `${home.needsHumanCount} thread${home.needsHumanCount === 1 ? '' : 's'} need a human reply or takeover.`,
            href: `/app/${org.slug}/inbox`,
            cta: 'Open inbox',
          }
        : home.draftQuotationCount > 0
          ? {
              title: 'Quotations to review',
              body: `${home.draftQuotationCount} draft${home.draftQuotationCount === 1 ? '' : 's'} still need pricing or approval.`,
              href: `/app/${org.slug}/quotations`,
              cta: 'Review quotations',
            }
          : {
              title: 'Your sales floor is live',
              body: 'Leads, conversations, and pipeline updates land here as visitors engage.',
              href: `/app/${org.slug}/inbox`,
              cta: 'Go to inbox',
            };

  const formatWhen = (value: string) =>
    new Intl.DateTimeFormat(org.locale, {
      timeZone: org.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  const activity = [
    ...home.recentLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      label: 'New lead',
      title: lead.name,
      detail: lead.latestVisitorMessage ?? lead.email,
      at: lead.createdAt,
      href: `/app/${org.slug}/inbox`,
    })),
    ...home.recentConversations.map((conversation) => ({
      id: `conversation-${conversation.id}`,
      label: conversation.needsHuman ? 'Needs reply' : 'Conversation',
      title: conversation.latestVisitorMessage?.slice(0, 80) || 'Website visitor',
      detail:
        conversation.latestEmployeeMessage?.slice(0, 100) ||
        (conversation.controlMode === 'human' ? 'With your team' : 'With the AI employee'),
      at: conversation.updatedAt,
      href: `/app/${org.slug}/inbox/${conversation.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  const shortcuts = [
    { href: `/app/${org.slug}/inbox`, label: 'Inbox' },
    { href: `/app/${org.slug}/crm`, label: 'CRM' },
    { href: `/app/${org.slug}/crm/pipeline`, label: 'Pipeline' },
    { href: `/app/${org.slug}/employee`, label: 'Sales employee' },
    { href: `/app/${org.slug}/widget`, label: 'Website' },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      <header className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          Hi {viewerName}
          {org.supportMode ? ' · viewing in support mode' : ''}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">{org.name}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {setupComplete
            ? 'This is your sales workspace — start with what needs a person, then follow the pipeline.'
            : 'Two steps get you live: configure the employee, then connect the website.'}
        </p>
      </header>

      <section className="mt-10 overflow-hidden rounded-2xl border border-input bg-[#f3f5f0]">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {setupComplete ? 'Start here' : 'Getting started'}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{primary.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{primary.body}</p>
            <div className="mt-6">
              <Button asChild>
                <Link href={primary.href}>
                  {primary.cta}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
          <div className="border-t border-input bg-[#e8eee6] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              At a glance
            </p>
            <dl className="mt-5 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Leads</dt>
                <dd className="text-lg font-semibold tabular-nums">{home.leadCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Open deals</dt>
                <dd className="text-lg font-semibold tabular-nums">{home.openOpportunityCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Conversations</dt>
                <dd className="text-lg font-semibold tabular-nums">{home.conversationCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-input pt-4">
                <dt className="text-sm text-muted-foreground">Employee</dt>
                <dd className="text-sm font-medium">
                  {home.employee
                    ? home.employee.status === 'paused'
                      ? 'Paused'
                      : 'Active'
                    : 'Not set'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Website</dt>
                <dd className="text-sm font-medium">
                  {!home.widget ? 'Not set' : home.widget.enabled ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_220px]">
        <section aria-label="Recent activity">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link href={`/app/${org.slug}/inbox`} className="text-sm font-medium text-primary">
              Inbox
            </Link>
          </div>
          {!activity.length ? (
            <div className="mt-5 rounded-xl border border-dashed border-input px-5 py-8">
              <p className="text-sm leading-6 text-muted-foreground">
                No visitor activity yet. After the website channel is connected, new chats and
                consented leads will show up here.
              </p>
            </div>
          ) : (
            <ul className="mt-2">
              {activity.map((item) => (
                <li key={item.id} className="border-b border-input last:border-0">
                  <Link
                    href={item.href}
                    className="group flex items-start justify-between gap-4 py-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium group-hover:text-primary">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                    <time
                      className="shrink-0 pt-0.5 text-xs text-muted-foreground"
                      dateTime={item.at}
                    >
                      {formatWhen(item.at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-label="Shortcuts">
          <h2 className="text-lg font-semibold">Go to</h2>
          <nav className="mt-4 space-y-1">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                {item.label}
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </main>
  );
}
