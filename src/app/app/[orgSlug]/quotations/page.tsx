import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getQuotationsPage } from '@/modules/quotations/service';
import {
  ApproveQuotationButton,
  CreateQuotationForm,
  PriceQuotationForm,
} from '@/components/quotation-forms';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getQuotationsPage(orgSlug);
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
      <h1 className="text-3xl font-semibold">Quotations</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Drafts and approvals bound to open opportunities. Sending to customers and payments are not
        configured. AI-requested drafts start at zero until a human sets pricing.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3" aria-label="Quotations">
          {!data.quotations.length && (
            <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
              No quotations yet.
            </p>
          )}
          {data.quotations.map((row) => (
            <article key={row.id} className="rounded-xl border border-input p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{row.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.totalLabel} · <span className="capitalize">{row.status}</span>
                  </p>
                </div>
                {row.status === 'draft' && (
                  <ApproveQuotationButton
                    slug={orgSlug}
                    quotationId={row.id}
                    editable={editable}
                    canApprove={row.totalMinor > 0}
                  />
                )}
              </div>
              {row.status === 'draft' && editable && (
                <PriceQuotationForm
                  slug={orgSlug}
                  quotation={{
                    id: row.id,
                    description: row.description,
                    quantity: row.quantity,
                    unitAmountMinor: row.unitAmountMinor,
                    notes: row.notes,
                    currency: row.currency,
                  }}
                  editable={editable}
                />
              )}
            </article>
          ))}
        </section>
        <CreateQuotationForm
          slug={orgSlug}
          opportunities={data.opportunities}
          editable={editable}
        />
      </div>
    </main>
  );
}
