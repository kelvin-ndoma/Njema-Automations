import { getUserOperations } from '@/modules/platform/operations-repository';
import { OperationForm } from './operation-form';
import { Field, Reason } from './fields';
import { Panel, formatDate } from './presentation';
export async function UserOperations({
  id,
  email,
  superAdmin,
}: {
  id: string;
  email: string;
  superAdmin: boolean;
}) {
  const data = await getUserOperations(id);
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Panel title="Account security">
        <div className="space-y-4 p-5">
          <p className="text-sm">
            Status: <strong>{data.restricted ? 'Restricted' : 'Unrestricted'}</strong> ·{' '}
            {data.sessions} unexpired database sessions
          </p>
          {superAdmin ? (
            <p className="text-sm text-muted-foreground">
              The sole Super Admin is protected from restriction and session revocation.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <OperationForm
                operation="user.state"
                hidden={{ userId: id, restricted: data.restricted ? 'off' : 'on' }}
                label={data.restricted ? 'Restore account access' : 'Restrict account'}
                sensitive
              >
                <Field name="confirmation" label={`Type account email: ${email}`} />
                <Reason />
              </OperationForm>
              <OperationForm
                operation="user.sessions"
                hidden={{ userId: id }}
                label="Revoke account sessions"
                sensitive
              >
                <Field name="confirmation" label={`Type account email: ${email}`} />
                <Reason />
              </OperationForm>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Identity & security history">
        <ul className="divide-y divide-input">
          {data.events.map((event) => (
            <li className="px-5 py-3 text-sm" key={event.id}>
              {event.action}
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatDate(event.createdAt, true)} UTC
              </span>
            </li>
          ))}
        </ul>
        {!data.events.length && (
          <p className="p-5 text-sm text-muted-foreground">No identity events recorded.</p>
        )}
      </Panel>
    </div>
  );
}
