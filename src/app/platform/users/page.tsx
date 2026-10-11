import Link from 'next/link';
import { getPlatformUsers } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import { PageHeading, Panel, formatDate, DetailLink } from '@/components/platform/presentation';
import { DirectoryFilters, DataTable, Pagination } from '@/components/platform/data-table';
import { Badge } from '@/components/ui/badge';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const result = await getPlatformUsers(await searchParams);
  return (
    <>
      <PageHeading
        eyebrow="Identity directory"
        title="Users"
        description="Global accounts and their organization memberships. Platform access remains separate."
      />
      <div className="mb-5">
        <DirectoryFilters action="/platform/users" q={result.q} />
      </div>
      <Panel
        title={`${result.total.toLocaleString('en')} users`}
        detail="Identity information only. Credentials and sessions are excluded."
      >
        <DataTable
          rows={result.rows}
          keyFor={(u) => u.id}
          caption="Registered user directory"
          columns={[
            {
              key: 'identity',
              title: 'User',
              render: (u) => (
                <Link href={`/platform/users/${u.id}`} className="font-medium hover:text-primary">
                  {u.name}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {u.email}
                  </span>
                </Link>
              ),
            },
            {
              key: 'membership',
              title: 'Memberships',
              render: (u) => (
                <div className="max-w-52">
                  <span className="text-xs tabular-nums">{u.membershipCount} recorded</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {u.organizations.join(', ') || 'No active organizations'}
                  </span>
                </div>
              ),
            },
            {
              key: 'email',
              title: 'Email',
              render: (u) => (
                <Badge tone={u.emailVerified ? 'success' : 'neutral'}>
                  {u.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              ),
            },
            {
              key: 'created',
              title: 'Registered · UTC',
              render: (u) => (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(u.createdAt)}
                </span>
              ),
            },
            {
              key: 'view',
              title: 'Details',
              render: (u) => (
                <DetailLink href={`/platform/users/${u.id}`} label={`View ${u.name}`} />
              ),
            },
          ]}
        />
        <Pagination result={result} path="/platform/users" query={{ q: result.q }} />
      </Panel>
    </>
  );
}
