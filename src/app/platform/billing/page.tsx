import {
  getOperationsDirectory,
  getPlatformSettings,
} from '@/modules/platform/operations-repository';
import { PageHeading, Panel, formatDate } from '@/components/platform/presentation';
import { DataTable, DirectoryFilters, Pagination } from '@/components/platform/data-table';
import { OperationForm } from '@/components/platform/operation-form';
import { Field, SelectField, ToggleField, Reason } from '@/components/platform/fields';
import type { SearchParams } from '@/modules/platform/input';
import { getAdministrativeEvents } from '@/modules/platform/event-repository';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const data = await getOperationsDirectory('billing', params);
  const settings = await getPlatformSettings();
  const events = await getAdministrativeEvents(
    typeof params.organization === 'string' ? params.organization : undefined,
  );
  return (
    <>
      <PageHeading
        eyebrow="Commercial operations"
        title="Billing & Subscriptions"
        description="Manage administrative plans, entitlements and trials. Live payments are not connected."
      />
      <div className="mb-5 rounded-lg border border-input bg-muted px-5 py-3 text-sm">
        Revenue and payment collection are unavailable. Assigning a plan does not create a payment
        or prove that a customer has paid.
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Organization subscriptions">
            <div className="p-4">
              <DirectoryFilters action="/platform/billing" q={data.q} />
            </div>
            <DataTable
              rows={data.rows}
              keyFor={(row) => row.id}
              caption="Organization subscriptions"
              columns={[
                { key: 'org', title: 'Organization', render: (row) => row.organizationName },
                { key: 'plan', title: 'Plan', render: (row) => row.label },
                { key: 'state', title: 'Lifecycle', render: (row) => row.status },
                { key: 'payment', title: 'Payment', render: (row) => row.detail },
                { key: 'date', title: 'Created UTC', render: (row) => formatDate(row.createdAt) },
              ]}
              emptyTitle="No subscriptions assigned"
              emptyDescription="Create a plan and assign it to an organization to establish entitlements."
            />
            <Pagination result={data} path="/platform/billing" query={{ q: data.q }} />
          </Panel>
          <Panel title="Subscription plans">
            <div className="divide-y divide-input">
              {data.plans.length ? (
                data.plans.map((plan) => (
                  <details key={plan.id} className="p-5">
                    <summary className="flex flex-wrap justify-between gap-3 text-sm">
                      <strong>{plan.name}</strong>
                      <span>
                        {plan.enabled ? 'Available' : 'Archived'} · {plan.dailyRequests}{' '}
                        requests/day
                      </span>
                    </summary>
                    <div className="mt-4">
                      <PlanForm plan={plan} />
                    </div>
                  </details>
                ))
              ) : (
                <p className="p-5 text-sm text-muted-foreground">
                  No plans configured. Prices are not inferred or fabricated.
                </p>
              )}
            </div>
          </Panel>
        </div>
        <div className="min-w-0 space-y-5">
          <Panel title="Assign plan / change lifecycle">
            <div className="p-5">
              {data.plans.some((plan) => plan.enabled) && data.organizations.length ? (
                <OperationForm operation="subscription.assign" label="Save subscription" sensitive>
                  <SelectField
                    name="organizationId"
                    label="Organization"
                    value={
                      typeof params.organization === 'string' ? params.organization : undefined
                    }
                    options={data.organizations.map((org) => ({ value: org.id, label: org.name }))}
                  />
                  <SelectField
                    name="planId"
                    label="Plan"
                    options={data.plans
                      .filter((plan) => plan.enabled)
                      .map((plan) => ({ value: plan.id, label: plan.name }))}
                  />
                  <SelectField
                    name="state"
                    label="Subscription state"
                    options={['trial', 'active', 'past_due', 'canceled'].map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                  <p className="text-sm">
                    Trials last {settings.trialDays} days under current policy. Payment remains
                    unconfigured.
                  </p>
                  <Field name="confirmation" label="Type organization address" />
                  <Reason />
                </OperationForm>
              ) : (
                <p className="text-sm text-muted-foreground">
                  An enabled plan and organization are required.
                </p>
              )}
            </div>
          </Panel>
          <Panel title="Create a plan">
            <div className="p-5">
              <PlanForm />
            </div>
          </Panel>
        </div>
      </div>
      <div className="mt-5">
        <Panel
          title="Billing event history"
          detail="Administrative subscription events; no fabricated payment receipts."
        >
          <DataTable
            rows={events}
            keyFor={(row) => row.id}
            caption="Billing event history"
            columns={[
              { key: 'action', title: 'Event', render: (row) => row.action },
              { key: 'org', title: 'Organization ID', render: (row) => row.organizationId },
              { key: 'state', title: 'State', render: (row) => row.state },
              {
                key: 'date',
                title: 'Recorded UTC',
                render: (row) => formatDate(row.createdAt, true),
              },
            ]}
            emptyTitle="No billing events recorded"
            emptyDescription="Subscription administration events will appear here; payment events require a connected provider."
          />
        </Panel>
      </div>
    </>
  );
}
type Plan = Awaited<ReturnType<typeof getOperationsDirectory>>['plans'][number];
function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <OperationForm
      operation="plan.save"
      sensitive={!!plan}
      hidden={{ id: plan?.id ?? '' }}
      label={plan ? 'Update plan' : 'Create plan'}
    >
      <Field name="code" label="Plan code" value={plan?.code} maxLength={48} />
      <Field name="name" label="Plan name" value={plan?.name} maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="currency" label="Currency code" value={plan?.currency} maxLength={3} />
        <Field
          name="monthlyPrice"
          label="Monthly price (optional)"
          type="number"
          required={false}
          value={plan?.monthlyPrice ?? ''}
          min={0}
        />
      </div>
      <Field
        name="dailyRequests"
        label="Daily request allowance"
        type="number"
        value={plan?.dailyRequests ?? 20}
        min={1}
      />
      <Field
        name="dailyTokens"
        label="Daily token allowance"
        type="number"
        value={plan?.dailyTokens ?? 100000}
        min={1}
      />
      <ToggleField name="aiEnabled" label="Includes AI execution" value={plan?.aiEnabled ?? true} />
      <ToggleField name="enabled" label="Available for assignment" value={plan?.enabled ?? true} />
      <Reason />
    </OperationForm>
  );
}
