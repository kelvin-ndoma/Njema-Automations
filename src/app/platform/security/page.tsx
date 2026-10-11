import { getPlatformAudit } from '@/modules/platform/read-repository';
import type { SearchParams } from '@/modules/platform/input';
import { PageHeading, AuditList, Panel } from '@/components/platform/presentation';
import { DirectoryFilters, Pagination } from '@/components/platform/data-table';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const result = await getPlatformAudit(await searchParams);
  return (
    <>
      <PageHeading
        eyebrow="Platform security"
        title="Security & Audit"
        description="Recorded identity and organization activity. Times are shown in UTC."
      />
      <DirectoryFilters action="/platform/security" q={result.q} />
      <Panel title="Audit activity">
        <AuditList events={result.rows} />
      </Panel>
      <Pagination result={result} path="/platform/security" query={{ q: result.q }} />
    </>
  );
}
