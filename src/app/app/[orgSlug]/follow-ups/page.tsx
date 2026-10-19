import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getFollowUps } from '@/modules/jobs/service';
import { FollowUpProcessButton } from '@/components/follow-up-process-button';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getFollowUps(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable =
    can(data.workspace.role, 'organization:update') &&
    !data.workspace.readOnly &&
    !data.workspace.supportMode;
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Follow-ups</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Consent-aware in-app follow-up jobs. Outbound email and SMS are not configured; due
            jobs create CRM activity for your team to continue the conversation.
          </p>
        </div>
        {editable && <FollowUpProcessButton slug={orgSlug} />}
      </div>
      <section className="mt-8 space-y-4" aria-label="Follow-up jobs">
        {!data.followUps.length && (
          <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
            No follow-ups scheduled. The AI employee can schedule one after a consented lead when
            that action is allowed.
          </p>
        )}
        {data.followUps.map((job) => (
          <article key={job.id} className="rounded-xl border border-input p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium capitalize">{job.status.replace('_', ' ')}</p>
              <time className="text-xs text-muted-foreground" dateTime={job.scheduledAt}>
                Due{' '}
                {new Intl.DateTimeFormat(data.workspace.locale, {
                  timeZone: data.workspace.timeZone,
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(job.scheduledAt))}
              </time>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{job.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">Channel: {job.channel}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
