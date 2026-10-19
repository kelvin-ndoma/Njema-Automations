import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getCrmPipeline } from '@/modules/crm/service';
import { CrmStageForm } from '@/components/crm-stage-form';
import { CrmSubnav } from '@/components/crm-subnav';

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
  const formatWhen = (value: string) =>
    new Intl.DateTimeFormat(data.workspace.locale, {
      timeZone: data.workspace.timeZone,
      dateStyle: 'medium',
    }).format(new Date(value));

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{data.pipeline.name}</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Opportunities grouped by stage. Cards are real CRM records from consented leads and
              team updates — not demo placeholders.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{data.opportunities.length}</strong> opportunities
          </p>
        </div>
        <CrmSubnav slug={orgSlug} active="pipeline" />

        {!data.opportunities.length ? (
          <p className="mt-8 rounded-xl border border-input p-5 text-sm text-muted-foreground">
            No opportunities yet. When a visitor shares contact details, an opportunity opens in
            New.
          </p>
        ) : (
          <section
            aria-label="Pipeline board"
            className="mt-6 flex gap-4 overflow-x-auto pb-4"
          >
            {data.stages.map((stage) => (
              <div
                key={stage.key}
                className="flex w-[280px] shrink-0 flex-col rounded-xl border border-input bg-[#f3f5f0]"
              >
                <header className="flex items-center justify-between border-b border-input px-4 py-3">
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <span className="rounded-md bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {stage.opportunities.length}
                  </span>
                </header>
                <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">
                  {!stage.opportunities.length && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                  {stage.opportunities.map((opportunity) => (
                    <article
                      key={opportunity.id}
                      className="rounded-lg border border-input bg-background p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-5">{opportunity.title}</h3>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {opportunity.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <Link
                          href={`/app/${orgSlug}/crm/${opportunity.contactId}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {opportunity.contactName}
                        </Link>
                        {opportunity.contactEmail ? ` · ${opportunity.contactEmail}` : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Updated {formatWhen(opportunity.updatedAt)}
                      </p>
                      <div className="mt-3 space-y-2 border-t border-input pt-3">
                        <CrmStageForm
                          slug={orgSlug}
                          opportunityId={opportunity.id}
                          stages={data.pipeline.stages}
                          currentStage={opportunity.stageKey}
                          editable={editable}
                        />
                        <div className="flex flex-wrap gap-3 text-xs">
                          <Link
                            href={`/app/${orgSlug}/crm/${opportunity.contactId}`}
                            className="font-medium text-primary"
                          >
                            Contact
                          </Link>
                          {opportunity.conversationId && (
                            <Link
                              href={`/app/${orgSlug}/inbox/${opportunity.conversationId}`}
                              className="font-medium text-primary"
                            >
                              Conversation
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
