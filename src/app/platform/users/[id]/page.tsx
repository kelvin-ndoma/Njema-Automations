import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPlatformUser } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import { PageHeading, Panel, formatDate, ProfileFields } from '@/components/platform/presentation';
import { Pagination } from '@/components/platform/data-table';
import { MembershipTable } from '@/components/platform/membership-table';
import { Badge } from '@/components/ui/badge';
import { UserOperations } from '@/components/platform/user-operations';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const data = await getPlatformUser(id, await searchParams);
  if (!data) notFound();
  const user = data.user;
  return (
    <>
      <Link
        href="/platform/users"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} /> User directory
      </Link>
      <PageHeading
        eyebrow="Account profile"
        title={user.name || 'Unnamed account'}
        description={user.email}
      >
        <Badge tone={data.superAdmin ? 'success' : 'neutral'}>
          {data.superAdmin ? 'Platform super administrator' : 'Customer account'}
        </Badge>
      </PageHeading>
      <div className="space-y-5">
        <Panel title="Account information">
          <ProfileFields
            fields={[
              [
                'User ID',
                <span key="id" className="font-mono text-xs">
                  {user.id}
                </span>,
              ],
              ['Registration date · UTC', formatDate(user.createdAt)],
              ['Email address', user.email],
              [
                'Email verification',
                <Badge key="verified" tone={user.emailVerified ? 'success' : 'neutral'}>
                  {user.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>,
              ],
              [
                'Platform access',
                data.superAdmin ? 'Sole super administrator' : 'No platform access',
              ],
              ['Account lifecycle status', 'Not recorded'],
            ]}
          />
        </Panel>
        <Panel
          title="Organization memberships"
          detail={`${data.memberships.total} recorded memberships`}
        >
          <MembershipTable rows={data.memberships.rows} perspective="user" />
          <Pagination result={data.memberships} path={`/platform/users/${user.id}`} />
        </Panel>
      </div>
      <UserOperations id={user.id} email={user.email} superAdmin={data.superAdmin} />
    </>
  );
}
