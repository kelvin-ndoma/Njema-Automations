import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getCrmPipeline } from '@/modules/crm/service';
import { CrmStageForm } from '@/components/crm-stage-form';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getCrmPipeline(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable =
    can(data.workspace.role, 'organization:update') &&
    !data.workspace.readOnly &&
    !data.workspace.supportMode;
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <Link href={`/app/${orgSlug}/crm`} className="text-sm text-primary">
        ← Contacts
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{data.pipeline.name}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Opportunities created from consented website leads. Stages are real CRM records, not demo
        data.
      </p>
      <section className="mt-8 space-y-4" aria-label="Opportunities">
        {!data.opportunities.length && (
          <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
            No opportunities yet. When a visitor shares contact details, an opportunity opens in
            New.
          </p>
        )}
        {data.opportunities.map((opportunity) => (
          <article key={opportunity.id} className="space-y-3 rounded-xl border border-input p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{opportunity.title}</h2>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {opportunity.status}
              </p>
            </div>
            <p className="text-sm">
              {opportunity.contactName} · {opportunity.contactEmail}
            </p>
            <CrmStageForm
              slug={orgSlug}
              opportunityId={opportunity.id}
              stages={data.pipeline.stages}
              currentStage={opportunity.stageKey}
              editable={editable}
            />
            {opportunity.conversationId && (
              <Link
                href={`/app/${orgSlug}/inbox/${opportunity.conversationId}`}
                className="inline-block text-sm font-medium text-primary"
              >
                Open conversation
              </Link>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
