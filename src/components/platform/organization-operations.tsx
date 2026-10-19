import Link from 'next/link';
import { getOrganizationOperations } from '@/modules/platform/operations-repository';
import { OperationForm } from './operation-form';
import { Field, TextField, ToggleField, Reason } from './fields';
import { Panel, formatDate } from './presentation';

export async function OrganizationOperations({
  id,
  slug,
  status,
  canPrivileged = true,
}: {
  id: string;
  slug: string;
  status: string | null;
  /** Super Admin only — suspend and global lifecycle mutations. */
  canPrivileged?: boolean;
}) {
  const data = await getOrganizationOperations(id);
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <Panel
          title="Administrative controls"
          detail="Support masking is audited and read-only. Suspension never deletes business data."
        >
          <div className="flex flex-wrap gap-3 p-5">
            {canPrivileged && (
              <OperationForm
                operation="organization.state"
                hidden={{
                  organizationId: id,
                  status: status === 'suspended' ? 'active' : status ? 'suspended' : 'active',
                }}
                label={
                  status === 'suspended'
                    ? 'Reactivate organization'
                    : status
                      ? 'Suspend organization'
                      : 'Initialize active lifecycle'
                }
                sensitive
              >
                <Field name="confirmation" label={`Type organization address: ${slug}`} />
                <Reason />
              </OperationForm>
            )}
            <OperationForm
              operation="organization.restrictions"
              hidden={{ organizationId: id }}
              label="Edit restrictions"
              sensitive
            >
              <ToggleField
                name="readOnly"
                label="Make customer workspace read-only"
                value={data.readOnly}
              />
              <ToggleField name="aiDisabled" label="Disable AI execution" value={data.aiDisabled} />
              <Field name="confirmation" label={`Type organization address: ${slug}`} />
              <Reason />
            </OperationForm>
            <OperationForm
              operation="support.enter"
              hidden={{ organizationId: id }}
              label="Mask into organization (support mode)"
              sensitive
            >
              <p className="text-sm">
                Opens this company&apos;s real workspace as a timed, audited, read-only support
                session so platform operators can diagnose issues. You remain yourself — this is
                not password impersonation and does not grant write access.
              </p>
              <Field name="confirmation" label={`Type organization address: ${slug}`} />
              <Reason />
            </OperationForm>
            <Link
              href={`/platform/billing?organization=${id}`}
              className="inline-flex items-center text-sm font-medium text-primary underline"
            >
              Manage subscription
            </Link>
          </div>
          <p className="border-t border-input px-5 py-3 text-xs text-muted-foreground">
            Workspace: {data.readOnly ? 'Read-only' : 'Normal access'} · AI:{' '}
            {data.aiDisabled ? 'Disabled' : 'Subject to plan and platform policy'}
          </p>
        </Panel>
        <Panel
          title="Employee inventory"
          detail="Configuration metadata only; knowledge and conversations remain private."
        >
          <div className="divide-y divide-input">
            {data.employees.length ? (
              data.employees.map((employee) => (
                <div className="flex justify-between gap-3 px-5 py-3 text-sm" key={employee.id}>
                  <strong>{employee.name}</strong>
                  <span className="text-muted-foreground">Revision {employee.revision}</span>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-muted-foreground">No sales employee configured.</p>
            )}
          </div>
        </Panel>
        <Panel title="Internal administrative notes">
          <div className="p-5">
            <OperationForm
              operation="organization.note"
              hidden={{ organizationId: id }}
              label="Add internal note"
            >
              <TextField name="note" label="Note — visible only to Super Admin" />
            </OperationForm>
          </div>
          <ul className="divide-y divide-input">
            {data.notes.map((note) => (
              <li key={note.id} className="px-5 py-3">
                <p className="whitespace-pre-wrap break-words text-sm">{note.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(note.createdAt, true)} UTC
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="space-y-5">
        <Panel title="Subscription & allowances">
          <dl className="space-y-3 p-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd>{data.subscription?.planName || 'No plan assigned'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Subscription</dt>
              <dd>{data.subscription?.state || 'Unconfigured'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment</dt>
              <dd>{data.subscription?.paymentStatus || 'Provider not connected'}</dd>
            </div>
            {data.subscription?.trialEndsAt && (
              <div>
                <dt>Trial ends</dt>
                <dd>{formatDate(data.subscription.trialEndsAt, true)} UTC</dd>
              </div>
            )}
          </dl>
        </Panel>
        <Panel title="Recorded AI usage">
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Requests</dt>
              <dd className="mt-1 text-xl font-semibold">{data.requests}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reported tokens</dt>
              <dd className="mt-1 text-xl font-semibold">{data.tokens}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Estimated provider cost</dt>
              <dd>
                {data.costMicroUsd === null
                  ? 'Unavailable — rates not recorded'
                  : `$${(data.costMicroUsd / 1000000).toFixed(4)} USD`}
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Support history">
          <p className="p-5 text-sm">
            {data.supportRequests} recorded requests.{' '}
            <Link href={`/platform/support?organization=${id}`} className="text-primary underline">
              Open support queue
            </Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}
