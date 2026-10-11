import { canAccessPlatform } from '@/modules/platform/service';
import Link from 'next/link';
import { ArrowUpRight, Building2, Plus } from 'lucide-react';
import { requireUser } from '@/server/session';
import { listWorkspaces } from '@/modules/organizations/service';
import { switchOrganization } from '@/modules/organizations/actions';
import { Brand } from '@/components/brand';
import { AccountMenu } from '@/components/account-menu';
import { Button } from '@/components/ui/button';
export default async function Page() {
  const user = await requireUser();
  const platformAccess = await canAccessPlatform();
  const workspaces = await listWorkspaces(user.id);
  return (
    <>
      <header className="flex h-20 items-center justify-between border-b border-input px-6 sm:px-10">
        <Brand />
        <AccountMenu name={user.name} platformAccess={platformAccess} />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
          Your businesses
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose your workspace.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Each business has its own team, settings, and private data.
        </p>
        {workspaces.length ? (
          <div className="mt-8 space-y-3">
            {workspaces.map((w) => (
              <form key={w.id} action={switchOrganization}>
                <input type="hidden" name="slug" value={w.slug} />
                <button className="flex w-full items-center gap-4 rounded-xl border border-input bg-white p-5 text-left hover:border-primary">
                  <Building2 size={24} className="text-primary" />
                  <span className="flex-1">
                    <span className="block font-medium">{w.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {w.role} · {w.timeZone}
                    </span>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-input bg-white p-8">
            <Building2 size={30} className="mb-5 text-primary" />
            <h2 className="text-xl font-medium">A fresh start for your business.</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Create your first workspace to establish a secure home for your sales operations.
            </p>
          </div>
        )}
        <Button asChild className="mt-6">
          <Link href="/organizations/new">
            <Plus size={16} /> Create workspace
          </Link>
        </Button>
      </main>
    </>
  );
}
