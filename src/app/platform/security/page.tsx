import { getPlatformAudit } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import { PageHeading, AuditList, Panel } from '@/components/platform/presentation';
import { DirectoryFilters, Pagination } from '@/components/platform/data-table';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const result = await getPlatformAudit(params);
  const value = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : '');
  return (
    <>
      <PageHeading
        eyebrow="Platform security"
        title="Security & Audit"
        description="Recorded identity and organization activity. Times are shown in UTC."
      />
      <DirectoryFilters action="/platform/security" q={result.q} />
      <form
        action="/platform/security"
        method="get"
        className="my-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <input type="hidden" name="q" value={result.q} />
        {(['organization', 'actor', 'from', 'to'] as const).map((key) => (
          <label key={key} className="text-xs capitalize">
            {key === 'organization'
              ? 'Organization ID'
              : key === 'actor'
                ? 'Actor ID'
                : `${key} date UTC`}
            <input
              name={key}
              type={key === 'from' || key === 'to' ? 'date' : 'text'}
              maxLength={100}
              defaultValue={value(key)}
              className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
        ))}
        <button className="h-10 rounded-lg border border-input px-4 text-sm font-medium text-primary">
          Apply audit filters
        </button>
      </form>
      <p className="mb-4 text-xs text-muted-foreground">
        Append-only application audit history. No deletion or retention-shortening controls are
        exposed. Administrative mutations and recorded authorization denials are included; arbitrary
        payloads and credentials are excluded.
      </p>
      <Panel title="Audit activity">
        <AuditList events={result.rows} />
      </Panel>
      <Pagination
        result={result}
        path="/platform/security"
        query={{
          q: result.q,
          organization: value('organization'),
          actor: value('actor'),
          from: value('from'),
          to: value('to'),
        }}
      />
    </>
  );
}
