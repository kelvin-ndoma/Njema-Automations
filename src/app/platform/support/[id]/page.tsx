import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupportRequest } from '@/modules/platform/operations-repository';
import { PageHeading, Panel, formatDate } from '@/components/platform/presentation';
import { OperationForm } from '@/components/platform/operation-form';
import { TextField, SelectField, ToggleField, Reason } from '@/components/platform/fields';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSupportRequest(id);
  if (!data) notFound();
  return (
    <>
      <Link className="text-sm text-primary" href="/platform/support">
        ← Support queue
      </Link>
      <PageHeading
        eyebrow="Support request"
        title={data.subject}
        description="Internal organization-linked support history."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Request status & assignment">
          <div className="p-5">
            <OperationForm
              operation="support.update"
              hidden={{ id }}
              label="Update support request"
            >
              <SelectField
                name="state"
                label="Status"
                value={data.state}
                options={['open', 'in_progress', 'resolved'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <ToggleField
                name="assigned"
                label="Assign to me (Super Admin)"
                value={data.assigned}
              />
              <TextField name="note" label="Add internal note (optional)" required={false} />
              <Reason />
            </OperationForm>
            <Link
              href={`/platform/organizations/${data.organizationId}`}
              className="mt-5 inline-block text-sm text-primary underline"
            >
              Open organization and support access controls
            </Link>
          </div>
        </Panel>
        <Panel title="Internal notes">
          <ul className="divide-y divide-input">
            {data.notes.map((note) => (
              <li className="p-5" key={note.id}>
                <p className="whitespace-pre-wrap break-words text-sm">{note.note}</p>
                <time className="mt-2 block text-xs text-muted-foreground">
                  {formatDate(note.createdAt, true)} UTC
                </time>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
