'use client';
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChartColumn,
  ContactRound,
  FileText,
  Globe2,
  House,
  Inbox,
  LoaderCircle,
  Radio,
  Settings,
  Sparkles,
  Timer,
  UsersRound,
} from 'lucide-react';

const areas = [
  { suffix: '', label: 'Overview', icon: House },
  { suffix: '/employee', label: 'Sales employee', icon: Sparkles },
  { suffix: '/widget', label: 'Website installation', icon: Globe2 },
  { suffix: '/channels', label: 'Channels', icon: Radio },
  { suffix: '/inbox', label: 'Inbox', icon: Inbox },
  { suffix: '/crm', label: 'CRM', icon: ContactRound },
  { suffix: '/follow-ups', label: 'Follow-ups', icon: Timer },
  { suffix: '/quotations', label: 'Quotations', icon: FileText },
  { suffix: '/appointments', label: 'Appointments', icon: CalendarDays },
  { suffix: '/analytics', label: 'Outcomes', icon: ChartColumn },
  { suffix: '/team', label: 'Team', icon: UsersRound },
  { suffix: '/settings', label: 'Business settings', icon: Settings },
  { suffix: '/test-chat', label: 'Test employee', icon: Sparkles },
];
function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <LoaderCircle size={14} className="ml-auto animate-spin text-muted-foreground" aria-hidden />;
}
export function WorkspaceNavigation({ slug, editable }: { slug: string; editable: boolean }) {
  const path = usePathname();
  return (
    <nav className="mt-5 space-y-1" aria-label="Workspace navigation">
      {areas
        .filter((area) => area.suffix !== '/test-chat' || editable)
        .map((area) => {
          const href = `/app/${slug}${area.suffix}`;
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${active ? 'bg-[#e0e9df] text-primary' : 'hover:bg-muted'}`}
            >
              <area.icon size={18} />
              <span className="min-w-0 flex-1 truncate">{area.label}</span>
              <LinkPending />
            </Link>
          );
        })}
    </nav>
  );
}
export function WorkspaceBreadcrumb() {
  const path = usePathname();
  const area =
    areas
      .filter((area) => area.suffix)
      .sort((a, b) => b.suffix.length - a.suffix.length)
      .find((area) => path.endsWith(area.suffix) || path.includes(`${area.suffix}/`))?.label ??
    'Overview';
  return (
    <p className="text-sm text-muted-foreground">
      Workspace <span className="mx-2 text-input">/</span>{' '}
      <span className="text-foreground">{area}</span>
    </p>
  );
}
