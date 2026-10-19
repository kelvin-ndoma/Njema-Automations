import { getSystemHealth, getOperationalMetrics } from '@/modules/platform/operations-reporting';
import { getOperationsDirectory } from '@/modules/platform/operations-repository';
import { PageHeading, Panel, ProfileFields, formatDate } from '@/components/platform/presentation';
import { DataTable, Pagination } from '@/components/platform/data-table';
import { OperationForm } from '@/components/platform/operation-form';
import { Field, SelectField, TextField, Reason } from '@/components/platform/fields';
import type { SearchParams } from '@/modules/platform/input';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const health = await getSystemHealth();
  const metrics = await getOperationalMetrics();
  const data = await getOperationsDirectory('health', params);
  return (
    <>
      <PageHeading
        eyebrow="Operational readiness"
        title="System Health"
        description={`Read-only checks performed ${formatDate(health.checkedAt, true)} UTC. Provider configuration does not imply provider connectivity.`}
      />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Service checks">
            <ProfileFields
              fields={[
                ['Application', health.application],
                ['Database', health.database],
                ['AI provider', health.provider],
                ['Background jobs', health.jobs],
                ['Integrations', health.integrations],
                ['Recorded failed AI requests (30 days)', metrics.errors],
              ]}
            />
          </Panel>
          <Panel title="Operational incidents">
            <DataTable
              rows={data.rows}
              keyFor={(row) => row.id}
              caption="Operational incident history"
              columns={[
                { key: 'subject', title: 'Incident', render: (row) => row.label },
                { key: 'state', title: 'Status', render: (row) => row.status },
                {
                  key: 'note',
                  title: 'Operational notes',
                  render: (row) => (
                    <span className="block max-w-sm whitespace-pre-wrap break-words text-xs">
                      {row.detail}
                    </span>
                  ),
                },
                {
                  key: 'resolve',
                  title: 'Actions',
                  render: (row) =>
                    row.status === 'investigating' ? (
                      <OperationForm
                        operation="incident.resolve"
                        hidden={{ id: row.id }}
                        label="Resolve incident"
                        sensitive
                      >
                        <Reason />
                      </OperationForm>
                    ) : (
                      <span className="text-xs text-muted-foreground">Resolved</span>
                    ),
                },
                {
                  key: 'date',
                  title: 'Recorded UTC',
                  render: (row) => formatDate(row.createdAt, true),
                },
              ]}
              emptyTitle="No operational incidents recorded"
              emptyDescription="This is a manual incident register, not a claim that no platform errors occurred."
            />
            <Pagination result={data} path="/platform/health" />
          </Panel>
        </div>
        <Panel title="Record an incident">
          <div className="p-5">
            <OperationForm operation="incident.save" label="Record incident">
              <Field name="subject" label="Incident summary" maxLength={120} />
              <SelectField
                name="state"
                label="Status"
                options={['investigating', 'resolved'].map((value) => ({ value, label: value }))}
              />
              <TextField name="note" label="Internal incident notes" />
            </OperationForm>
          </div>
        </Panel>
      </div>
    </>
  );
}
