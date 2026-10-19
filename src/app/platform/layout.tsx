import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requirePlatformOperator } from '@/modules/platform/service';
import { AccountMenu } from '@/components/account-menu';
import { PlatformHeaderIdentity } from '@/components/platform/header-identity';
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
  // Only auth gates the shell. Settings and page queries must not block each other.
  const user = await requirePlatformOperator();
  return (
    <div className="flex min-h-screen">
      <PlatformSidebar platformRole={user.platformRole} />
      <div className="min-w-0 flex-1">
        <a
          href="#platform-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
        >
          Skip to content
        </a>
        <header className="flex h-16 items-center justify-between border-b border-input bg-background px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <MobilePlatformNavigation platformRole={user.platformRole} />
            <PlatformBreadcrumb />
          </div>
          <div className="flex items-center gap-4">
            <Suspense
              fallback={
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Platform operations
                </span>
              }
            >
              <PlatformHeaderIdentity platformRole={user.platformRole} />
            </Suspense>
            <AccountMenu name={user.name} platformAccess context="platform" />
          </div>
        </header>
        <main id="platform-content" className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
