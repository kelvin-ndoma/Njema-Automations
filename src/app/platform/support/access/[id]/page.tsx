import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupportAccess } from '@/modules/platform/operations-repository';
import { OperationForm } from '@/components/platform/operation-form';
import { Panel, ProfileFields, formatDate, StatusBadge } from '@/components/platform/presentation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSupportAccess(id);
  if (!data) notFound();
  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-20 mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4"
      >
        <div>
          <strong className="text-sm">Support inspection · {data.name}</strong>
          <p className="mt-1 text-xs">
            Read-only · expires {formatDate(data.expiresAt, true)} UTC · no impersonation or
            customer conversation access
          </p>
          <p className="mt-1 break-words text-sm">Reason: {data.reason}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/platform/organizations/${data.organizationId}`}
            className="inline-flex items-center text-sm font-medium text-primary underline"
          >
            Full platform profile
          </Link>
          <OperationForm operation="support.exit" hidden={{ id }} label="Exit support mode" />
        </div>
      </div>

      <section className="mb-5 rounded-xl border border-input bg-white p-5">
        <h2 className="text-lg font-semibold">Detected issues</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational signals for this organization. Customer chat content is intentionally
          excluded.
        </p>
        {data.issues.length ? (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
            {data.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No open lifecycle, restriction, subscription, setup or AI failure signals were found.
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Authorized business profile"
          detail="Explicitly authorized support metadata only."
        >
          <ProfileFields
            fields={[
              ['Organization', data.name],
              ['Address', `/${data.slug}`],
              ['Lifecycle', <StatusBadge key="status" status={data.status || null} />],
              ['Currency', data.currency || 'Not recorded'],
              ['Locale', data.locale || 'Not recorded'],
              ['Time zone', data.timeZone || 'Not recorded'],
              ['Active members', String(data.members)],
              ['Sales employees', String(data.employees)],
              ['Workspace', data.readOnly ? 'Read-only' : 'Normal access'],
              ['AI policy', data.aiDisabled ? 'Disabled' : 'Subject to plan and platform policy'],
            ]}
          />
        </Panel>

        <Panel title="Subscription & AI signals">
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Plan</dt>
              <dd>{data.subscription?.planName || 'No plan assigned'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subscription</dt>
              <dd>{data.subscription?.state || 'Unconfigured'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Payment</dt>
              <dd>{data.subscription?.paymentStatus || 'Provider not connected'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">AI requests</dt>
              <dd>{data.aiRequests}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Failed AI requests</dt>
              <dd>{data.aiFailed}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Pending AI reservations</dt>
              <dd>{data.aiPending}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Open support requests</dt>
              <dd>
                {data.openSupport}{' '}
                <Link
                  href={`/platform/support?organization=${data.organizationId}`}
                  className="text-primary underline"
                >
                  Open queue
                </Link>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Internal notes">
          {data.notes.length ? (
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
          ) : (
            <p className="p-5 text-sm text-muted-foreground">No internal notes yet.</p>
          )}
        </Panel>
        <Panel title="Recent platform actions on this organization">
          {data.audit.length ? (
            <ul className="divide-y divide-input">
              {data.audit.map((row) => (
                <li key={row.id} className="px-5 py-3 text-sm">
                  <p className="font-medium">{row.action}</p>
                  {row.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(row.createdAt, true)} UTC
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">No platform audit events yet.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
