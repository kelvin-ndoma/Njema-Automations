import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getChannelsPage } from '@/modules/channels/service';
import { EmailChannelForm, WhatsAppChannelForm } from '@/components/channel-forms';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getChannelsPage(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable =
    can(data.workspace.role, 'organization:update') &&
    !data.workspace.readOnly &&
    !data.workspace.supportMode;
  const website = data.channels.find((row) => row.provider === 'website_widget')!;
  const email = data.channels.find((row) => row.provider === 'email')!;
  const whatsapp = data.channels.find((row) => row.provider === 'whatsapp')!;
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Channels</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Customer conversations are channel-independent. Website chat is live when installed. Email
        and WhatsApp accept configuration only — live delivery stays blocked without verified
        providers.
      </p>
      <section className="mt-8 rounded-xl border border-input p-5">
        <h2 className="text-sm font-semibold">Website chat</h2>
        <p className="mt-2 text-sm capitalize text-muted-foreground">Status: {website.status}</p>
        <p className="mt-2 text-sm text-muted-foreground">{website.activationNote}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Allowed origins: {website.config.originCount ?? 0}
        </p>
        <Link href={`/app/${orgSlug}/widget`} className="mt-4 inline-block text-sm text-primary">
          Open website installation
        </Link>
      </section>
      <div className="mt-6 grid gap-6">
        <EmailChannelForm slug={orgSlug} editable={editable} channel={email} />
        <WhatsAppChannelForm slug={orgSlug} editable={editable} channel={whatsapp} />
      </div>
    </main>
  );
}
