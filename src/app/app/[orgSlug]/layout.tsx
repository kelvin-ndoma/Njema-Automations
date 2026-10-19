import { canAccessPlatform } from '@/modules/platform/service';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, ChevronDown, Plus, ShieldCheck } from 'lucide-react';
import { requireUser } from '@/server/session';
import { listWorkspaces, workspaceFor } from '@/modules/organizations/service';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { switchOrganization } from '@/modules/organizations/actions';
import { Brand } from '@/components/brand';
import { AccountMenu } from '@/components/account-menu';
import { WorkspaceNavigation, WorkspaceBreadcrumb } from '@/components/workspace-navigation';
import { OperationForm } from '@/components/platform/operation-form';
import { Button } from '@/components/ui/button';
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await requireUser(`/app/${orgSlug}`);
  const platformAccess = await canAccessPlatform();
  let org;
  try {
    org = await workspaceFor(user.id, orgSlug);
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
  // Support inspection must not list other tenant memberships in the switcher.
  const workspaces = org.supportMode
    ? [
        {
          id: org.id,
          name: org.name,
          slug: org.slug,
          currency: org.currency,
          timeZone: org.timeZone,
          locale: org.locale,
          role: org.role,
        },
      ]
    : await listWorkspaces(user.id);
  const editable = can(org.role, 'organization:update') && !org.readOnly && !org.supportMode;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-input bg-[#f3f5f0] p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <Brand />
          <span className="text-[10px] tracking-wider text-muted-foreground">WORKSPACE</span>
        </div>
        <details className="relative mt-5">
          <summary className="flex list-none items-center gap-2 rounded-lg border border-input bg-background px-3 py-3 text-sm font-medium">
            <Building2 size={17} />
            <span className="min-w-0 flex-1 truncate">{org.name}</span>
            <ChevronDown size={15} />
          </summary>
          <div className="absolute top-full z-20 mt-2 w-full rounded-xl border border-input bg-background p-2 shadow-lg">
            {workspaces.map((w) => (
              <form action={switchOrganization} key={w.id}>
                <input type="hidden" name="slug" value={w.slug} />
                <button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted">
                  {w.name}
                  {w.slug === org.slug ? ' ✓' : ''}
                </button>
              </form>
            ))}
            {!org.supportMode && (
              <Link
                href="/organizations/new"
                className="mt-1 flex items-center gap-2 border-t border-input px-2 py-3 text-sm"
              >
                <Plus size={14} /> New workspace
              </Link>
            )}
            {org.supportMode && platformAccess && (
              <Link
                href={`/platform/organizations/${org.id}`}
                className="mt-1 flex items-center gap-2 border-t border-input px-2 py-3 text-sm"
              >
                Back to platform profile
              </Link>
            )}
          </div>
        </details>
        <WorkspaceNavigation slug={org.slug} editable={editable} />
        <div className="mt-auto hidden space-y-3 pt-8 lg:block">
          {org.supportMode && platformAccess ? (
            <>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/platform">
                  <ArrowLeft size={15} />
                  Back to platform
                </Link>
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Support inspection — read only.
              </p>
            </>
          ) : (
            <>
              <ShieldCheck size={18} className="mb-2 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                A private workspace. Access follows your membership.
              </p>
            </>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        {org.supportMode && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-3 sm:px-8"
          >
            <div>
              <p className="text-sm font-medium">Support mode · viewing {org.name}</p>
              <p className="text-xs text-muted-foreground">
                Read-only customer experience. Expires{' '}
                {org.supportMode.expiresAt
                  ? new Intl.DateTimeFormat('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(org.supportMode.expiresAt))
                  : 'soon'}{' '}
                UTC.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {platformAccess && (
                <Button asChild size="sm">
                  <Link href="/platform">
                    <ArrowLeft size={15} />
                    Back to platform
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/platform/support/access/${org.supportMode.id}`}>Issue summary</Link>
              </Button>
              <OperationForm
                operation="support.exit"
                hidden={{ id: org.supportMode.id }}
                label="Exit support mode"
              />
            </div>
          </div>
        )}
        <header className="flex h-16 items-center justify-between border-b border-input px-6 sm:px-8">
          <WorkspaceBreadcrumb />
          <AccountMenu
            name={user.name}
            platformAccess={platformAccess}
            context={org.supportMode ? 'platform' : 'app'}
          />
        </header>
        {children}
      </div>
    </div>
  );
}
