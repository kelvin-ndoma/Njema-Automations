import Link from 'next/link';
import { getPlatformOrganizations } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import {
  PageHeading,
  Panel,
  formatDate,
  StatusBadge,
  DetailLink,
} from '@/components/platform/presentation';
import { DirectoryFilters, DataTable, Pagination } from '@/components/platform/data-table';
import { OperationForm } from '@/components/platform/operation-form';
import { Field, Reason } from '@/components/platform/fields';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const result = await getPlatformOrganizations(await searchParams);
  return (
    <>
      <PageHeading
        eyebrow="Business directory"
        title="Organizations"
        description="Review business profiles, ownership, and registration details."
      />
      <div className="mb-5">
        <DirectoryFilters
          action="/platform/organizations"
          q={result.q}
          status={result.status}
          supportedStatuses={result.supportedStatuses}
        />
      </div>
      <Panel
        title={`${result.total.toLocaleString('en')} organizations`}
        detail="Lifecycle status is shown only where recorded."
      >
        <DataTable
          rows={result.rows}
          keyFor={(o) => o.id}
          caption="Organization directory"
          columns={[
            {
              key: 'name',
              title: 'Organization',
              render: (o) => (
                <div>
                  <Link
                    href={`/platform/organizations/${o.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {o.name}
                  </Link>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    /{o.slug}
                  </span>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link href={`/platform/organizations/${o.id}`} className="text-primary underline">
                      Admin profile
                    </Link>
                    <Link href={`/app/${o.slug}`} className="text-primary underline">
                      Customer workspace
                    </Link>
                  </div>
                </div>
              ),
            },
            {
              key: 'owner',
              title: 'Owner',
              render: (o) =>
                o.owners.length ? (
                  <div className="max-w-52">
                    <Link
                      href={`/platform/users/${o.owners[0].id}`}
                      className="block truncate text-xs font-medium hover:text-primary"
                    >
                      {o.owners[0].name}
                    </Link>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {o.owners[0].email}
                    </span>
                    {o.owners.length > 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{o.owners.length - 1} additional owners
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No active owner recorded</span>
                ),
            },
            { key: 'status', title: 'Status', render: (o) => <StatusBadge status={o.status} /> },
            {
              key: 'team',
              title: 'Active team',
              render: (o) => <span className="text-xs tabular-nums">{o.memberCount}</span>,
            },
            {
              key: 'employees',
              title: 'Employees',
              render: (o) => <span className="text-xs tabular-nums">{o.employeeCount}</span>,
            },
            {
              key: 'subscription',
              title: 'Subscription',
              render: (o) => <span className="text-xs">{o.subscriptionState || 'Unassigned'}</span>,
            },
            {
              key: 'created',
              title: 'Created · UTC',
              render: (o) => (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(o.createdAt)}
                </span>
              ),
            },
            {
              key: 'view',
              title: 'Details',
              render: (o) => (
                <div className="flex items-center gap-3">
                  <DetailLink href={`/platform/organizations/${o.id}`} label={`View ${o.name}`} />
                  <OperationForm
                    operation="organization.state"
                    hidden={{
                      organizationId: o.id,
                      status:
                        o.status === 'suspended' ? 'active' : o.status ? 'suspended' : 'active',
                    }}
                    label={
                      o.status === 'suspended' ? 'Reactivate' : o.status ? 'Suspend' : 'Initialize'
                    }
                    sensitive
                  >
                    <Field name="confirmation" label={`Type organization address: ${o.slug}`} />
                    <Reason />
                  </OperationForm>
                </div>
              ),
            },
          ]}
        />
        <Pagination
          result={result}
          path="/platform/organizations"
          query={{ q: result.q, status: result.status }}
        />
      </Panel>
    </>
  );
}
