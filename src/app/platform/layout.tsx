import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/modules/platform/service';
import { AccountMenu } from '@/components/account-menu';
import {
  PlatformSidebar,
  MobilePlatformNavigation,
  PlatformBreadcrumb,
} from '@/components/platform/navigation';
export const metadata: Metadata = {
  title: 'Platform control center',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return (
    <div className="flex min-h-screen">
      <PlatformSidebar />
      <div className="min-w-0 flex-1">
        <a
          href="#platform-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
        >
          Skip to content
        </a>
        <header className="flex h-16 items-center justify-between border-b border-input bg-background px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <MobilePlatformNavigation />
            <PlatformBreadcrumb />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Platform operations
            </span>
            <AccountMenu name={user.name} platformAccess />
          </div>
        </header>
        <main id="platform-content" className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
