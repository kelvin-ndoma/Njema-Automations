'use client';
import { useActionState } from 'react';
import {
  approveQuotationAction,
  createQuotationAction,
  priceQuotationAction,
} from '@/modules/quotations/actions';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function CreateQuotationForm({
  slug,
  opportunities,
  editable,
}: {
  slug: string;
  opportunities: Array<{ id: string; title: string; contactName: string }>;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(createQuotationAction.bind(null, slug), {});
  if (!editable) return null;
  if (!opportunities.length) {
    return (
      <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
        Create an open opportunity from a consented lead before drafting a quotation.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">Draft quotation</h2>
      <p className="text-xs text-muted-foreground">
        Drafts stay internal until approved. Customer email delivery is not configured.
      </p>
      <label className="block text-sm">
        <span className="mb-2 block font-medium">Opportunity</span>
        <select
          name="opportunityId"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {opportunities.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title} · {row.contactName}
            </option>
          ))}
        </select>
      </label>
      <div>
        <label htmlFor="quote-title" className="mb-2 block text-sm font-medium">
          Title
        </label>
        <Input id="quote-title" name="title" required minLength={2} maxLength={120} />
      </div>
      <div>
        <label htmlFor="quote-description" className="mb-2 block text-sm font-medium">
          Line description
        </label>
        <Input id="quote-description" name="description" required minLength={2} maxLength={500} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="quote-qty" className="mb-2 block text-sm font-medium">
            Quantity
          </label>
          <Input id="quote-qty" name="quantity" type="number" min={1} defaultValue={1} required />
        </div>
        <div>
          <label htmlFor="quote-amount" className="mb-2 block text-sm font-medium">
            Unit amount
          </label>
          <Input
            id="quote-amount"
            name="unitAmount"
            type="number"
            min={0}
            step="0.01"
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="quote-notes" className="mb-2 block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="quote-notes"
          name="notes"
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-input bg-background p-3 text-sm"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save draft'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Draft quotation saved.
        </p>
      )}
    </form>
  );
}

export function ApproveQuotationButton({
  slug,
  quotationId,
  editable,
  canApprove,
}: {
  slug: string;
  quotationId: string;
  editable: boolean;
  canApprove: boolean;
}) {
  const [state, action, pending] = useActionState(approveQuotationAction.bind(null, slug), {});
  if (!editable) return null;
  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="quotationId" value={quotationId} />
      <Button type="submit" size="sm" disabled={pending || !canApprove}>
        {pending ? 'Approving…' : 'Approve'}
      </Button>
      {!canApprove && (
        <p className="text-xs text-muted-foreground">Set a positive price before approving.</p>
      )}
      {state.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function PriceQuotationForm({
  slug,
  quotation,
  editable,
}: {
  slug: string;
  quotation: {
    id: string;
    description: string;
    quantity: number;
    unitAmountMinor: number;
    notes: string;
    currency: string;
  };
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(priceQuotationAction.bind(null, slug), {});
  if (!editable) return null;
  const decimals =
    new Intl.NumberFormat('en', { style: 'currency', currency: quotation.currency })
      .resolvedOptions()
      .maximumFractionDigits ?? 2;
  const unitMajor = quotation.unitAmountMinor / 10 ** decimals;
  return (
    <form action={action} className="mt-3 space-y-3 rounded-lg border border-dashed border-input p-4">
      <input type="hidden" name="quotationId" value={quotation.id} />
      <p className="text-xs font-medium">Set pricing (required for AI-requested zero drafts)</p>
      <Input name="description" defaultValue={quotation.description} required minLength={2} />
      <div className="grid grid-cols-2 gap-2">
        <Input name="quantity" type="number" min={1} defaultValue={quotation.quantity} required />
        <Input
          name="unitAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={unitMajor || ''}
          required
        />
      </div>
      <textarea
        name="notes"
        maxLength={2000}
        rows={2}
        defaultValue={quotation.notes}
        className="w-full rounded-lg border border-input bg-background p-2 text-sm"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save pricing'}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
