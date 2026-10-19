import {
  Building2,
  CalendarDays,
  ContactRound,
  FileText,
  Globe2,
  Inbox,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
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
  const { workspace: org } = home;
  const formattedDate = new Intl.DateTimeFormat(org.locale, {
    timeZone: org.timeZone,
    dateStyle: 'long',
  }).format(new Date());
  const setupComplete = !!(home.employee && home.widget);
  const hasActivity = home.leadCount > 0 || home.conversationCount > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.16em] text-primary">{org.name}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {setupComplete ? 'Sales workforce' : 'A strong start.'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {org.supportMode
              ? 'Read-only support view of this organization’s customer workspace.'
              : setupComplete
                ? 'What your AI employee and team are working on — real counts only.'
                : 'Hire and train your AI sales employee, then connect your website.'}
          </p>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatusCard
          icon={Sparkles}
          label="Sales employee"
          value={
            home.employee
              ? home.employee.status === 'paused'
                ? `${home.employee.name} (paused)`
                : home.employee.name
              : 'Not configured'
          }
          detail={
            home.employee
              ? `Revision ${home.employee.revision}`
              : 'Add goals, knowledge and allowed actions.'
          }
          href={`/app/${org.slug}/employee`}
        />
        <StatusCard
          icon={Globe2}
          label="Website channel"
          value={
            !home.widget ? 'Not installed' : home.widget.enabled ? 'Enabled' : 'Disabled'
          }
          detail={
            home.widget
              ? `${home.widget.originCount} allowed origin${home.widget.originCount === 1 ? '' : 's'}`
              : 'Allow your site origins to go live.'
          }
          href={`/app/${org.slug}/widget`}
        />
        <StatusCard
          icon={Inbox}
          label="Needs attention"
          value={
            home.needsHumanCount > 0
              ? `${home.needsHumanCount} conversation${home.needsHumanCount === 1 ? '' : 's'}`
              : 'None'
          }
          detail={
            hasActivity
              ? `${home.conversationCount} conversation${home.conversationCount === 1 ? '' : 's'} · ${home.leadCount} lead${home.leadCount === 1 ? '' : 's'}`
              : 'Human takeover and escalations appear here.'
          }
          href={`/app/${org.slug}/inbox`}
        />
        <StatusCard
          icon={ContactRound}
          label="Open opportunities"
          value={String(home.openOpportunityCount)}
          detail="From consented leads in your CRM pipeline."
          href={`/app/${org.slug}/crm/pipeline`}
        />
        <StatusCard
          icon={Timer}
          label="Follow-ups"
          value={String(home.pendingFollowUpCount)}
          detail="Pending in-app reminder jobs (no outbound email yet)."
          href={`/app/${org.slug}/follow-ups`}
        />
        <StatusCard
          icon={FileText}
          label="Draft quotations"
          value={String(home.draftQuotationCount)}
          detail="Internal drafts awaiting approval. Customer send is not configured."
          href={`/app/${org.slug}/quotations`}
        />
        <StatusCard
          icon={CalendarDays}
          label="Appointments"
          value={String(home.openAppointmentCount)}
          detail="Requested or confirmed. External calendar sync is not configured."
          href={`/app/${org.slug}/appointments`}
        />
      </section>

      {!setupComplete && (
        <section className="mt-8 grid overflow-hidden rounded-2xl border border-input bg-white md:grid-cols-[1.5fr_1fr]">
          <div className="p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf2e8] px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck size={13} /> Workspace established
            </span>
            <h2 className="mt-5 text-2xl font-medium tracking-tight">
              Finish setup for {org.name}.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Configure your sales employee, allow website origins, and review consented visitor
              leads in your inbox.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/app/${org.slug}/employee`}>Configure sales employee</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/app/${org.slug}/widget`}>Website installation</Link>
              </Button>
            </div>
          </div>
          <div
            className="hidden items-center justify-center bg-[#eef3e9] p-8 md:flex"
            aria-hidden="true"
          >
            <div className="relative flex size-36 items-center justify-center rounded-full border border-primary/15">
              <div className="flex size-24 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
                <Sparkles size={40} strokeWidth={1.3} />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-input p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Recent leads</h2>
            <Link href={`/app/${org.slug}/inbox`} className="text-xs font-medium text-primary">
              Open inbox
            </Link>
          </div>
          {!home.recentLeads.length ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No consented leads yet for this organization.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {home.recentLeads.map((lead) => (
                <li key={lead.id} className="border-t border-input pt-4 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{lead.name}</p>
                    <time className="text-xs text-muted-foreground" dateTime={lead.createdAt}>
                      {new Intl.DateTimeFormat(org.locale, {
                        timeZone: org.timeZone,
                        dateStyle: 'medium',
                      }).format(new Date(lead.createdAt))}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lead.email}</p>
                  {lead.latestVisitorMessage && (
                    <p className="mt-2 text-sm">{lead.latestVisitorMessage}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-input p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            <Link href={`/app/${org.slug}/inbox`} className="text-xs font-medium text-primary">
              View all
            </Link>
          </div>
          {!home.recentConversations.length ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No website conversations yet for this organization.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {home.recentConversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className="border-t border-input pt-4 first:border-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {conversation.controlMode === 'human' ? 'Human control' : 'AI control'}
                      {conversation.needsHuman ? ' · Needs human' : ''}
                      {conversation.hasLead ? ' · Lead' : ''}
                    </p>
                    <time className="text-xs text-muted-foreground" dateTime={conversation.updatedAt}>
                      {new Intl.DateTimeFormat(org.locale, {
                        timeZone: org.timeZone,
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(conversation.updatedAt))}
                    </time>
                  </div>
                  {conversation.latestVisitorMessage && (
                    <p className="mt-2 text-sm">Visitor: {conversation.latestVisitorMessage}</p>
                  )}
                  {conversation.latestEmployeeMessage && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Latest reply: {conversation.latestEmployeeMessage}
                    </p>
                  )}
                  <Link
                    href={`/app/${org.slug}/inbox/${conversation.id}`}
                    className="mt-2 inline-block text-xs font-medium text-primary"
                  >
                    Open thread
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-input p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 size={17} /> Business profile
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd>{org.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Your role</dt>
              <dd className="capitalize">{org.supportMode ? 'Support (read-only)' : org.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="truncate">/{org.slug}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-xl border border-input p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Globe2 size={17} /> Regional preferences
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{org.currency}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Time zone</dt>
              <dd>{org.timeZone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Locale</dt>
              <dd>{org.locale}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-input bg-white p-5 transition-colors hover:border-primary/40"
    >
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">
        <Icon size={14} /> {label}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </Link>
  );
}
