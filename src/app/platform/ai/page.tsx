import {
  getOperationsDirectory,
  getPlatformSettings,
} from '@/modules/platform/operations-repository';
import { getOperationalMetrics } from '@/modules/platform/operations-reporting';
import { PageHeading, Panel, formatDate } from '@/components/platform/presentation';
import { DataTable, Pagination, DirectoryFilters } from '@/components/platform/data-table';
import { OperationForm } from '@/components/platform/operation-form';
import { Field, ToggleField, Reason } from '@/components/platform/fields';
import type { SearchParams } from '@/modules/platform/input';
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const data = await getOperationsDirectory('ai', params);
  const metrics = await getOperationalMetrics(params);
  const settings = await getPlatformSettings();
  return (
    <>
      <PageHeading
        eyebrow="Execution oversight"
        title="AI Operations"
        description="Combined private-test and website-widget AI usage. Business knowledge and conversation content are excluded."
      />
      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-input bg-input lg:grid-cols-3 xl:grid-cols-6">
        {[
          ['Total requests', metrics.requests],
          ['Private tests', metrics.testRequests],
          ['Website widget', metrics.widgetRequests],
          ['Reported tokens', metrics.tokens],
          ['Failed private tests', metrics.errors],
          [
            'Estimated private-test cost',
            metrics.costMicroUsd === null
              ? 'Unavailable'
              : `$${(metrics.costMicroUsd / 1000000).toFixed(4)} USD`,
          ],
        ].map(([label, value]) => (
          <div className="bg-white p-4" key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mb-5 text-sm text-muted-foreground">
        Last {metrics.days} UTC days. Widget tokens come from reserved DailyAIUsage commitments.
        Private-test cost estimates use configured rates only when every completed test is priced.
        Daily defaults: {settings.dailyRequests} requests / {settings.dailyTokens} tokens. Monetary
        ceiling: {settings.dailyCostUsd === null ? 'Not configured' : `$${settings.dailyCostUsd} USD`}
        .
      </p>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Employee inventory">
            <div className="p-4">
              <DirectoryFilters action="/platform/ai" q={data.q} />
            </div>
            <DataTable
              caption="AI employee inventory"
              rows={data.rows}
              keyFor={(row) => row.id}
              columns={[
                { key: 'name', title: 'Employee', render: (row) => row.label },
                { key: 'org', title: 'Organization', render: (row) => row.organizationName },
                { key: 'rev', title: 'Configuration', render: (row) => row.detail },
                { key: 'date', title: 'Updated UTC', render: (row) => formatDate(row.createdAt) },
              ]}
              emptyTitle="No employees configured"
              emptyDescription="Configured customer employees will appear here; no illustrative records are included."
            />
            <Pagination result={data} path="/platform/ai" query={{ q: data.q }} />
          </Panel>
          <Panel title="Daily usage trend">
            <DataTable
              caption="Daily AI usage"
              rows={metrics.trend}
              keyFor={(row) => row.date}
              columns={[
                { key: 'day', title: 'UTC day', render: (row) => row.date },
                { key: 'req', title: 'Requests', render: (row) => row.requests },
                { key: 'tokens', title: 'Reported tokens', render: (row) => row.tokens },
              ]}
            />
          </Panel>
        </div>
        <div className="min-w-0 space-y-5">
          <Panel title="Model policies & rates">
            <div className="divide-y divide-input">
              {metrics.models.map((model) => (
                <details className="p-5" key={model.model}>
                  <summary className="text-sm font-medium">
                    {model.model} · {model.enabled ? 'Enabled' : 'Disabled'}
                  </summary>
                  <div className="mt-4">
                    <ModelForm model={model} />
                  </div>
                </details>
              ))}
              {!metrics.models.length && (
                <p className="p-5 text-sm text-muted-foreground">
                  No rate policy recorded. A monetary ceiling requires configured model rates.
                </p>
              )}
            </div>
          </Panel>
          <Panel title="Add model policy">
            <div className="p-5">
              <ModelForm />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
function ModelForm({
  model,
}: {
  model?: Awaited<ReturnType<typeof getOperationalMetrics>>['models'][number];
}) {
  return (
    <OperationForm operation="model.save" label="Save model policy" sensitive>
      <Field name="model" label="Model identifier" value={model?.model} maxLength={100} />
      <Field
        name="inputUsdPerMillion"
        label="Input USD per million tokens"
        type="number"
        value={model?.inputUsdPerMillion ?? ''}
        min={0}
      />
      <Field
        name="outputUsdPerMillion"
        label="Output USD per million tokens"
        type="number"
        value={model?.outputUsdPerMillion ?? ''}
        min={0}
      />
      <ToggleField name="enabled" label="Allow this model" value={model?.enabled ?? true} />
      <Reason />
    </OperationForm>
  );
}
