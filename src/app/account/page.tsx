import { canAccessPlatform } from '@/modules/platform/service';
import Link from 'next/link';
import { requireUser } from '@/server/session';
import { AccountMenu } from '@/components/account-menu';
import { Brand } from '@/components/brand';
export default async function Page() {
  const user = await requireUser();
  const platformAccess = await canAccessPlatform();
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="flex justify-between">
        <Brand />
        <AccountMenu name={user.name} platformAccess={platformAccess} />
      </div>
      <Link href="/organizations" className="mt-8 block text-sm text-primary">
        ← Workspaces
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Your account</h1>
      <dl className="mt-6 space-y-4 rounded-xl border border-input p-6 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="mt-1">{user.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="mt-1 break-all">{user.email}</dd>
        </div>
      </dl>
    </main>
  );
}
