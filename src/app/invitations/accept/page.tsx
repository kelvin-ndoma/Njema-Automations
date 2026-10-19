import { AcceptInvitationForm } from '@/components/accept-invitation-form';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-6 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold">Accept invitation</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Sign in with the invited email address, then accept to join the workspace.
      </p>
      <div className="mt-8">
        <AcceptInvitationForm token={token ?? ''} />
      </div>
    </main>
  );
}
