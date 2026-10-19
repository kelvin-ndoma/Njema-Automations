import { notFound } from 'next/navigation';
import Script from 'next/script';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getWidgetSettings } from '@/modules/widget/service';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getWidgetSettings(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  if (!can(data.workspace.role, 'organization:update') || !data.settings?.enabled) notFound();
  const src = `${data.loaderBase.replace(/\/$/, '')}/api/widget/loader?key=${data.settings.publicKey}`;
  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Website chat preview</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        This page loads your public widget against the current Relay origin. Add that origin to the
        allow list before testing. Visitor messages and consented leads appear in the inbox.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-input bg-[#f7f8f4] p-10 text-sm text-muted-foreground">
        Use the chat control in the corner to send a test question or share contact details.
      </div>
      <Script src={src} strategy="afterInteractive" />
    </main>
  );
}
