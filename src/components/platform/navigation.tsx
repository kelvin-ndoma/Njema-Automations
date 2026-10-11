'use client';
import Link from 'next/link';
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
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { cn } from '@/lib/utils';
const links = [
  { href: '/platform', label: 'Overview', icon: LayoutDashboard },
  { href: '/platform/organizations', label: 'Organizations', icon: Building2 },
  { href: '/platform/users', label: 'Users', icon: UsersRound },
  { href: '/platform/security', label: 'Security & Audit', icon: ShieldCheck },
];
function Navigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <>
      <div className="px-3 pt-6">
        <Brand />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
          Platform control center
        </p>
      </div>
      <nav aria-label="Platform navigation" className="mt-9 space-y-1">
        {links.map((link) => {
          const active =
            link.href === '/platform' ? path === link.href : path.startsWith(link.href);
          const item = (
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <link.icon size={17} />
              {link.label}
            </Link>
          );
          return mobile ? (
            <Dialog.Close asChild key={link.href}>
              {item}
            </Dialog.Close>
          ) : (
            <div key={link.href}>{item}</div>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pb-5 pt-10">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-primary">
          <ShieldCheck size={15} /> Super administrator
        </div>
        <Link
          href="/organizations"
          className="flex items-center justify-between border-t border-input pt-4 text-xs text-muted-foreground hover:text-primary"
        >
          My organization workspaces
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}
export function PlatformSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-input bg-[#f1f4ee] px-4 lg:flex">
      <Navigation />
    </aside>
  );
}
export function MobilePlatformNavigation() {
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
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-background px-4 shadow-xl">
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
          <Navigation mobile />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PlatformBreadcrumb() {
  const path = usePathname();
  const area = path.includes('/security')
    ? 'Security & Audit'
    : path.includes('/organizations')
      ? 'Organizations'
      : path.includes('/users')
        ? 'Users'
        : 'Overview';
  return (
    <p className="text-sm text-muted-foreground">
      <span className="hidden sm:inline">
        Platform <span className="mx-3 text-input">/</span>
      </span>
      <span className="font-medium text-foreground">{area}</span>
    </p>
  );
}
