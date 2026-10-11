import Link from 'next/link';
import type { MembershipRow } from '@/modules/platform/types';
import { DataTable } from './data-table';
import { StatusBadge, formatDate } from './presentation';
export function MembershipTable({
  rows,
  perspective,
}: {
  rows: MembershipRow[];
  perspective: 'organization' | 'user';
}) {
  return (
    <DataTable
      rows={rows}
      keyFor={(m) => m.id}
      caption="Organization memberships"
      emptyTitle="No memberships recorded"
      emptyDescription="This record has no organization memberships."
      columns={[
        {
          key: 'identity',
          title: perspective === 'organization' ? 'Member' : 'Organization',
          render: (m) =>
            perspective === 'organization' ? (
              m.user ? (
                <Link
                  href={`/platform/users/${m.user.id}`}
                  className="text-xs font-medium hover:text-primary"
                >
                  {m.user.name}
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                    {m.user.email}
                  </span>
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">User unavailable</span>
              )
            ) : m.organizationSlug ? (
              <Link
                href={`/platform/organizations/${m.organizationId}`}
                className="text-xs font-medium hover:text-primary"
              >
                {m.organizationName}
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                  /{m.organizationSlug}
                </span>
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Organization unavailable</span>
            ),
        },
        {
          key: 'role',
          title: 'Role',
          render: (m) => <span className="text-xs capitalize">{m.role}</span>,
        },
        { key: 'status', title: 'Membership', render: (m) => <StatusBadge status={m.status} /> },
        {
          key: 'created',
          title: 'Joined · UTC',
          render: (m) => (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDate(m.createdAt)}
            </span>
          ),
        },
      ]}
    />
  );
}
