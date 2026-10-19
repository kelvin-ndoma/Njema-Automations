import { notFound } from 'next/navigation';
import { requireUser } from '@/server/session';
import { workspaceFor } from '@/modules/organizations/service';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { BusinessSettingsForm } from '@/components/business-settings-form';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const user = await requireUser();
  let workspace;
  try {
    workspace = await workspaceFor(user.id, orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Business settings</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Update your business profile and regional preferences.
      </p>
      <BusinessSettingsForm
        workspace={workspace}
        currencies={Intl.supportedValuesOf('currency')}
        timeZones={Intl.supportedValuesOf('timeZone')}
        editable={can(workspace.role, 'organization:update') && !workspace.readOnly}
      />
    </main>
  );
}
