import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getWidgetSettings } from '@/modules/widget/service';
import { WidgetSettingsForm } from '@/components/widget-settings-form';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getWidgetSettings(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable = can(data.workspace.role, 'organization:update') && !data.workspace.readOnly;
  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Website installation</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Allow specific website origins, embed the chat loader, and collect consented visitor
        contacts in your inbox.
      </p>
      {!data.settings?.employeeReady && (
        <p className="mt-4 text-sm">
          <Link href={`/app/${orgSlug}/employee`} className="text-primary underline">
            Configure your sales employee first.
          </Link>
        </p>
      )}
      <WidgetSettingsForm
        slug={orgSlug}
        settings={data.settings}
        loaderBase={data.loaderBase}
        editable={editable}
      />
      {data.settings?.enabled && (
        <p className="mt-6 text-sm">
          <Link href={`/app/${orgSlug}/widget/preview`} className="text-primary underline">
            Open the same-origin preview
          </Link>{' '}
          after adding this Relay origin to the allow list.
        </p>
      )}
    </main>
  );
}
