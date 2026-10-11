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
                <DetailLink href={`/platform/organizations/${o.id}`} label={`View ${o.name}`} />
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
