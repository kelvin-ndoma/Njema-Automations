'use client';
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Building2,
  UsersRound,
  LayoutDashboard,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Sparkles,
  LifeBuoy,
  Activity,
  Settings,
  LoaderCircle,
  KeyRound,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { cn } from '@/lib/utils';
import type { PlatformRole } from '@/modules/platform/repository';

const baseLinks = [
  { href: '/platform', label: 'Overview', icon: LayoutDashboard },
  { href: '/platform/organizations', label: 'Organizations', icon: Building2 },
  { href: '/platform/users', label: 'Users', icon: UsersRound },
  { href: '/platform/billing', label: 'Billing & Subscriptions', icon: CreditCard },
  { href: '/platform/ai', label: 'AI Operations', icon: Sparkles },
  { href: '/platform/support', label: 'Support Operations', icon: LifeBuoy },
  { href: '/platform/security', label: 'Security & Audit', icon: ShieldCheck },
  { href: '/platform/health', label: 'System Health', icon: Activity },
  { href: '/platform/settings', label: 'Platform Settings', icon: Settings },
];

const breadcrumbExtras = [
  { href: '/platform/account', label: 'Account' },
  { href: '/platform/operators', label: 'Platform operators' },
];

function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <LoaderCircle size={14} className="ml-auto animate-spin opacity-80" aria-hidden />;
}

function Navigation({
  mobile = false,
  platformRole,
}: {
  mobile?: boolean;
  platformRole: PlatformRole;
}) {
  const path = usePathname();
  const links =
    platformRole === 'super-admin'
      ? [
          ...baseLinks.slice(0, 8),
          { href: '/platform/operators', label: 'Platform operators', icon: KeyRound },
          ...baseLinks.slice(8),
        ]
      : baseLinks;
  return (
    <>
      <div className="px-3 pt-6">
        <Brand />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
          Platform control center
        </p>
      </div>
      <nav aria-label="Platform navigation" className="mt-6 space-y-0.5">
        {links.map((link, index) => {
          const active =
            link.href === '/platform' ? path === link.href : path.startsWith(link.href);
          const item = (
            <Link
              href={link.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <link.icon size={17} />
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              <LinkPending />
            </Link>
          );
          return (
            <div key={link.href}>
              {[0, 1, 3, platformRole === 'super-admin' ? 9 : 8].includes(index) && (
                <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  {index === 0
                    ? 'Command center'
                    : index === 1
                      ? 'Customers'
                      : index === 3
                        ? 'Operations'
                        : 'Configuration'}
                </p>
              )}
              {mobile ? <Dialog.Close asChild>{item}</Dialog.Close> : item}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pb-5 pt-10">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-primary">
          <ShieldCheck size={15} />
          {platformRole === 'super-admin' ? 'Super administrator' : 'Platform administrator'}
        </div>
        <Link
          href="/organizations"
          prefetch
          className="flex items-center justify-between border-t border-input pt-4 text-xs text-muted-foreground hover:text-primary"
        >
          My organization workspaces
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}

export function PlatformSidebar({ platformRole }: { platformRole: PlatformRole }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start overflow-y-auto border-r border-input bg-[#f1f4ee] px-4 lg:flex">
      <Navigation platformRole={platformRole} />
    </aside>
  );
}

export function MobilePlatformNavigation({ platformRole }: { platformRole: PlatformRole }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Open platform navigation"
        className="rounded-lg p-2 hover:bg-muted lg:hidden"
      >
        <Menu size={20} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/35" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-background px-4 shadow-xl">
          <Dialog.Title className="sr-only">Platform navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Navigate the platform control center.
          </Dialog.Description>
          <Dialog.Close
            aria-label="Close navigation"
            className="absolute top-5 right-4 rounded-md p-2"
          >
            <X size={18} />
          </Dialog.Close>
          <Navigation mobile platformRole={platformRole} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function PlatformBreadcrumb() {
  const path = usePathname();
  const area =
    [...breadcrumbExtras, ...baseLinks]
      .reverse()
      .find((link) => link.href !== '/platform' && path.startsWith(link.href))?.label ?? 'Overview';
  return (
    <p className="text-sm text-muted-foreground">
      <span className="hidden sm:inline">
        Platform <span className="mx-3 text-input">/</span>
      </span>
      <span className="font-medium text-foreground">{area}</span>
    </p>
  );
}
