import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from './data-table';
import type { AuditRow } from '@/modules/platform/types';
export function formatDate(value: string | null, time = false) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(new Date(value));
}
export function StatusBadge({ status }: { status: string | null }) {
  return (
    <Badge
      tone={
        status === 'active'
          ? 'success'
          : status === 'suspended' || status === 'revoked'
            ? 'warning'
            : 'neutral'
      }
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not recorded'}
    </Badge>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-full">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Panel({
  title,
  detail,
  children,
  action,
}: {
  title: string;
  detail?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-input bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-input px-5 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function DetailLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:underline"
    >
      View <ArrowUpRight size={14} />
    </Link>
  );
}
export function AuditList({ events }: { events: AuditRow[] }) {
  if (!events.length)
    return (
      <EmptyState
        title="No audit activity recorded"
        description="Recorded identity and administrative events will appear here."
      />
    );
  return (
    <ul className="divide-y divide-input/70">
      {events.map((event) => (
        <li key={event.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium capitalize">{event.action.replace(/[._]/g, ' ')}</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {event.source === 'organization' ? 'Organization event' : 'Identity event'} · Actor{' '}
              {event.actorId.slice(-8) || 'not recorded'}
            </p>
          </div>
          <time
            dateTime={event.createdAt ?? undefined}
            className="shrink-0 text-right text-[10px] text-muted-foreground"
          >
            {formatDate(event.createdAt, true)}
            <span className="block">UTC</span>
          </time>
        </li>
      ))}
    </ul>
  );
}
export function ProfileFields({ fields }: { fields: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">{label}</dt>
          <dd className="mt-1.5 break-words text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
