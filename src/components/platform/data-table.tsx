import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PageResult } from '@/modules/platform/types';
export interface Column<T> {
  key: string;
  title: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}
export function DataTable<T>({
  rows,
  columns,
  caption,
  keyFor,
  emptyTitle = 'No records found',
  emptyDescription = 'Try a different search or clear your filters.',
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  keyFor: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-input bg-muted/50">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${c.className ?? ''}`}
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFor(row)}
              className="border-b border-input/70 last:border-0 hover:bg-muted/30"
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-5 py-3 align-middle ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 rounded-xl bg-muted p-3">
        <Inbox size={23} className="text-primary" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
export function DirectoryFilters({
  action,
  q,
  status,
  supportedStatuses = [],
}: {
  action: string;
  q: string;
  status?: string;
  supportedStatuses?: string[];
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-44 flex-1 sm:max-w-sm">
        <Search
          size={16}
          aria-hidden="true"
          className="absolute top-3 left-3 text-muted-foreground"
        />
        <Input
          name="q"
          aria-label="Search directory"
          defaultValue={q}
          maxLength={80}
          placeholder="Search by name or address"
          className="h-10 pl-9"
        />
      </div>
      {status !== undefined && (
        <select
          name="status"
          aria-label="Organization status"
          defaultValue={status}
          className="!h-10 !w-auto !min-w-36"
        >
          <option value="all">All statuses</option>
          <option value="untracked">Initialization pending</option>
          {supportedStatuses.map((s) => (
            <option value={s} key={s}>
              {s === 'active' ? 'Active' : 'Suspended'}
            </option>
          ))}
        </select>
      )}
      <Button variant="outline" type="submit">
        Apply
      </Button>
      {(q || (status && status !== 'all')) && (
        <Link
          href={action}
          className="px-2 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          Clear filters
        </Link>
      )}
    </form>
  );
}
export function Pagination({
  result,
  path,
  query = {},
}: {
  result: Pick<PageResult<unknown>, 'page' | 'pages' | 'total' | 'size'>;
  path: string;
  query?: Record<string, string>;
}) {
  const url = (page: number) => {
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    return `${path}?${params}`;
  };
  const first = result.total ? (result.page - 1) * result.size + 1 : 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-input px-5 py-3 text-xs text-muted-foreground">
      <p>
        {first}–{Math.min(result.page * result.size, result.total)} of{' '}
        {result.total.toLocaleString('en')} records
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-3">
        {result.page > 1 ? (
          <Link
            href={url(result.page - 1)}
            aria-label="Previous page"
            className="rounded-md border border-input p-2 hover:bg-muted"
          >
            <ArrowLeft size={14} />
          </Link>
        ) : (
          <span aria-disabled="true" className="rounded-md border border-input p-2 opacity-35">
            <ArrowLeft size={14} />
          </span>
        )}
        <span>
          Page {result.page} of {result.pages}
        </span>
        {result.page < result.pages ? (
          <Link
            href={url(result.page + 1)}
            aria-label="Next page"
            className="rounded-md border border-input p-2 hover:bg-muted"
          >
            <ArrowRight size={14} />
          </Link>
        ) : (
          <span aria-disabled="true" className="rounded-md border border-input p-2 opacity-35">
            <ArrowRight size={14} />
          </span>
        )}
      </nav>
    </div>
  );
}
