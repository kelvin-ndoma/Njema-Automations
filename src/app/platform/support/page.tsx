import Link from 'next/link';
import { getOperationsDirectory } from '@/modules/platform/operations-repository';
import type { SearchParams } from '@/modules/platform/input';
import { PageHeading, Panel, formatDate } from '@/components/platform/presentation';
import { DataTable, Pagination, DirectoryFilters } from '@/components/platform/data-table';
import { OperationForm } from '@/components/platform/operation-form';
import { Field, TextField, SelectField } from '@/components/platform/fields';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const data = await getOperationsDirectory('support', params);
  return (
    <>
      <PageHeading
        eyebrow="Customer operations"
        title="Support Operations"
        description="Track organization-linked requests, internal notes and explicit read-only support access."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Support queue">
          <div className="p-4">
            <DirectoryFilters action="/platform/support" q={data.q} />
            <form method="get" className="mt-3 flex gap-3">
              <input type="hidden" name="q" value={data.q} />
              <select
                name="state"
                defaultValue={data.state}
                aria-label="Support status"
                className="!w-auto !h-9"
              >
                <option value="">All request statuses</option>
                {['open', 'in_progress', 'resolved'].map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
              <button className="text-sm font-medium text-primary">Filter requests</button>
            </form>
          </div>
          <DataTable
            caption="Support request queue"
            rows={data.rows}
            keyFor={(row) => row.id}
            columns={[
              {
                key: 'subject',
                title: 'Request',
                render: (row) => (
                  <Link className="font-medium text-primary" href={`/platform/support/${row.id}`}>
                    {row.label}
                  </Link>
                ),
              },
              { key: 'org', title: 'Organization', render: (row) => row.organizationName },
              { key: 'state', title: 'Status', render: (row) => row.status },
              { key: 'assignment', title: 'Assignment', render: (row) => row.detail },
              { key: 'date', title: 'Opened UTC', render: (row) => formatDate(row.createdAt) },
            ]}
            emptyTitle="No support requests"
            emptyDescription="Create a request when a business needs assistance."
          />
          <Pagination
            result={data}
            path="/platform/support"
            query={{ q: data.q, state: data.state }}
          />
        </Panel>
        <Panel title="Open a support request">
          <div className="p-5">
            {data.organizations.length ? (
              <OperationForm operation="support.create" label="Create support request">
                <SelectField
                  name="organizationId"
                  label="Organization"
                  value={typeof params.organization === 'string' ? params.organization : undefined}
                  options={data.organizations.map((org) => ({ value: org.id, label: org.name }))}
                />
                <Field name="subject" label="Subject" maxLength={120} />
                <TextField name="note" label="Initial internal note" />
              </OperationForm>
            ) : (
              <p className="text-sm">An organization is required.</p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
