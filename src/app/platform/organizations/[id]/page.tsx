import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getPlatformOrganization } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import {
  PageHeading,
  Panel,
  formatDate,
  StatusBadge,
  ProfileFields,
  AuditList,
} from '@/components/platform/presentation';
import { Pagination } from '@/components/platform/data-table';
import { MembershipTable } from '@/components/platform/membership-table';
import { OrganizationOperations } from '@/components/platform/organization-operations';
import { Button } from '@/components/ui/button';
import { requirePlatformOperator } from '@/modules/platform/service';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const operator = await requirePlatformOperator();
  const { id } = await params;
  const data = await getPlatformOrganization(id, await searchParams);
  if (!data) notFound();
  const org = data.organization;
  return (
    <>
      <Link
        href="/platform/organizations"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} /> Organization directory
      </Link>
      <PageHeading eyebrow="Organization profile" title={org.name} description={`/${org.slug}`}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={org.status} />
          <Button asChild>
            <Link href={`/app/${org.slug}`}>
              Open customer workspace <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      </PageHeading>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        This page is the platform operator profile for the company. To see their workspace, use{' '}
        <strong>Open customer workspace</strong> if you already have membership, or{' '}
        <strong>Mask into organization (support mode)</strong> below for a timed, audited,
        read-only support session. Org team members who sign in land in their own `/app` workspace
        — they do not receive platform access.
      </p>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Panel title="Business profile">
            <ProfileFields
              fields={[
                [
                  'Organization ID',
                  <span className="font-mono text-xs" key="id">
                    {org.id}
                  </span>,
                ],
                ['Created · UTC', formatDate(org.createdAt)],
                ['Currency', org.currency || 'Not recorded'],
                ['Locale', org.locale || 'Not recorded'],
                ['Time zone', org.timeZone || 'Not recorded'],
                ['Account status', <StatusBadge key="status" status={org.status} />],
              ]}
            />
            <div className="border-t border-input px-5 py-4">
              <h3 className="text-[11px] text-muted-foreground">Active owners</h3>
              <div className="mt-2 flex flex-wrap gap-3">
                {org.owners.length ? (
                  org.owners.map((owner) => (
                    <Link
                      key={owner.id}
                      href={`/platform/users/${owner.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {owner.name}
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No active owner recorded</p>
                )}
              </div>
            </div>
          </Panel>
          <Panel
            title="Organization memberships"
            detail={`${data.memberships.total} recorded memberships`}
          >
            <MembershipTable rows={data.memberships.rows} perspective="organization" />
            <Pagination result={data.memberships} path={`/platform/organizations/${org.id}`} />
          </Panel>
        </div>
        <Panel
          title="Recent organization audit"
          detail="Latest recorded events for this organization"
        >
          <AuditList events={data.activity} />
        </Panel>
      </div>
      <OrganizationOperations
        id={org.id}
        slug={org.slug}
        status={org.status}
        canPrivileged={operator.platformRole === 'super-admin'}
      />
    </>
  );
}
