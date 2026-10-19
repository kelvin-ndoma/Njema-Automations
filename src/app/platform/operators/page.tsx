import { getPlatformOperatorsPage } from '@/modules/platform/service';
import { PageHeading, Panel } from '@/components/platform/presentation';
import {
  GrantPlatformAdminForm,
  RevokePlatformAdminForm,
} from '@/components/platform/operator-forms';

export default async function Page() {
  const data = await getPlatformOperatorsPage();
  return (
    <>
      <PageHeading
        eyebrow="Platform access"
        title="Platform operators"
        description="Super Admin is unique. Platform Admins help operate Relay and can mask into customer organizations through audited Support Mode."
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Current grants" detail="Resolved from live platformRoles records.">
          <div className="divide-y divide-input">
            {data.operators.map((operator) => (
              <div
                key={operator.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {operator.name ?? operator.email ?? operator.userId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {operator.email ?? 'Email unavailable'} ·{' '}
                    <span className="capitalize">{operator.role.replace('-', ' ')}</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{operator.userId}</p>
                </div>
                {operator.role === 'platform-admin' && (
                  <RevokePlatformAdminForm userId={operator.userId} />
                )}
              </div>
            ))}
          </div>
        </Panel>
        <GrantPlatformAdminForm />
      </div>
    </>
  );
}
