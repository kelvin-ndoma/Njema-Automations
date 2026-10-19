import Link from 'next/link';
import { ArrowUpRight, Building2, UsersRound, Plus, CircleCheck, Info } from 'lucide-react';
import { getPlatformOverview } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import {
  PageHeading,
  Panel,
  formatDate,
  AuditList,
  StatusBadge,
} from '@/components/platform/presentation';
import { DataTable, EmptyState } from '@/components/platform/data-table';
import { GrowthChart } from '@/components/platform/growth-chart';
import { InfoDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getOperationalMetrics } from '@/modules/platform/operations-reporting';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [data, operations] = await Promise.all([
    getPlatformOverview(params),
    getOperationalMetrics(params),
  ]);
  const metrics = [
    {
      label: 'Total organizations',
      value: data.totalOrganizations,
      detail: 'All registered businesses',
      icon: Building2,
    },
    {
      label: 'Registered users',
      value: data.totalUsers,
      detail: 'All global user accounts',
      icon: UsersRound,
    },
    {
      label: 'New organizations',
      value: data.recentOrganizations,
      detail: `Selected ${data.days}-day period · UTC`,
      icon: Plus,
    },
    {
      label: 'Active organizations',
      value: data.activeOrganizations,
      detail:
        data.activeOrganizations === null
          ? 'Lifecycle status not recorded'
          : `${data.statusRecorded} organizations have recorded status`,
      icon: CircleCheck,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Your platform at a glance"
        title="Operations overview"
        description="A clear view of your organizations, people, and recent activity."
      >
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="days" className="sr-only">
            Reporting period
          </label>
          <select
            id="days"
            name="days"
            defaultValue={String(data.days)}
            className="!h-9 !w-auto !text-xs"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm">
            Update
          </Button>
        </form>
      </PageHeading>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <section className="rounded-xl border border-input bg-white p-4" key={metric.label}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium text-muted-foreground">{metric.label}</h2>
              <metric.icon size={16} className="shrink-0 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
              {metric.value === null ? '—' : metric.value.toLocaleString('en')}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{metric.detail}</p>
          </section>
        ))}
      </div>
      <section
        className="mb-5 overflow-hidden rounded-xl border border-input bg-white"
        aria-label="Operational signals"
      >
        <div className="grid grid-cols-2 divide-input md:grid-cols-4 xl:grid-cols-8">
          {(
            [
              ['Suspended organizations', operations.suspended],
              ['Trial organizations', operations.trials],
              ['Active subscriptions', operations.activeSubscriptions],
              ['AI requests', operations.requests],
              ['Reported AI tokens', operations.tokens],
              ['Failed AI requests', operations.errors],
              ['Open support requests', operations.openSupport],
              ['Open incidents', operations.incidents],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="border-r border-b border-input px-4 py-3">
              <h2 className="text-xs text-muted-foreground">{label}</h2>
              <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
          <span>
            AI period: {operations.days} UTC days · Estimated provider cost:{' '}
            {operations.costMicroUsd === null
              ? 'Unavailable — incomplete pricing records'
              : `$${(operations.costMicroUsd / 1000000).toFixed(4)} USD`}
          </span>
          <span>MRR / payments: unavailable — billing provider not connected</span>
        </div>
      </section>
      <section
        className="mb-5 rounded-xl border border-input bg-[#f1f4ee] px-5 py-4"
        aria-label="Operational alerts"
      >
        <h2 className="text-sm font-semibold">Operational attention</h2>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {operations.untracked > 0 && (
            <li>
              <Link
                href="/platform/organizations?status=untracked"
                className="text-primary underline"
              >
                {operations.untracked} organizations need lifecycle initialization
              </Link>
            </li>
          )}
          {operations.pending > 0 && (
            <li>
              <Link href="/platform/ai" className="text-primary underline">
                {operations.pending} AI requests await reconciliation
              </Link>
            </li>
          )}
          <li>
            <Link href="/platform/support" className="text-primary underline">
              {operations.openSupport} open support requests
            </Link>
          </li>
          <li>
            <Link href="/platform/health" className="text-primary underline">
              Review system health and {operations.incidents} open incidents
            </Link>
          </li>
        </ul>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title="Organization growth"
          detail={`${formatDate(data.from)} – ${formatDate(data.asOf)} · UTC`}
          action={
            <InfoDialog
              title="How this report is calculated"
              trigger={
                <button
                  aria-label="About platform metrics"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <Info size={16} />
                </button>
              }
            >
              <p>
                Totals include all recorded organizations and registered users. New organizations
                and the growth trend use creation timestamps within the selected UTC calendar-day
                period, through the time this page was loaded.
              </p>
              <p className="mt-3">
                Active counts include only organizations explicitly recorded as active. Missing
                status is never assumed to mean active. Each zero in the chart means no
                registrations were recorded on that date.
              </p>
              <p className="mt-3">
                Updated {formatDate(data.asOf, true)} UTC. Values are current database reads.
              </p>
            </InfoDialog>
          }
        >
          {data.recentOrganizations ? (
            <GrowthChart points={data.trend} />
          ) : (
            <EmptyState
              title="No new organizations in this period"
              description="Choose a longer reporting period to review earlier registrations."
            />
          )}
          <details className="border-t border-input px-5 py-3">
            <summary className="text-xs font-medium text-primary">
              View daily registration counts
            </summary>
            <div className="mt-3 max-h-40 overflow-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Daily registration counts in UTC</caption>
                <thead>
                  <tr>
                    <th className="pb-2">Date (UTC)</th>
                    <th className="pb-2 text-right">Organizations</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((day) => (
                    <tr key={day.date}>
                      <td className="py-1">{day.date}</td>
                      <td className="text-right tabular-nums">{day.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>
        <Panel
          title="Recent audit activity"
          detail="Latest recorded identity and organization events"
        >
          <AuditList events={data.activity} />
        </Panel>
      </div>
      <div className="mt-5">
        <Panel
          title="Latest organizations"
          detail="Most recent registrations · all time"
          action={
            <Link
              href="/platform/organizations"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              Directory <ArrowUpRight size={14} />
            </Link>
          }
        >
          <DataTable
            rows={data.newest}
            keyFor={(o) => o.id}
            caption="Latest registered organizations"
            emptyTitle="No organizations registered"
            emptyDescription="Organizations will appear here when businesses create their workspaces."
            columns={[
              {
                key: 'name',
                title: 'Organization',
                render: (o) => (
                  <Link
                    href={`/platform/organizations/${o.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {o.name}
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      /{o.slug}
                    </span>
                  </Link>
                ),
              },
              { key: 'status', title: 'Status', render: (o) => <StatusBadge status={o.status} /> },
              {
                key: 'created',
                title: 'Created · UTC',
                render: (o) => (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(o.createdAt)}
                  </span>
                ),
              },
            ]}
          />
        </Panel>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Database-backed figures · updated {formatDate(data.asOf, true)} UTC
      </p>
    </>
  );
}
