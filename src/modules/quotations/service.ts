import 'server-only';
import { requireUser } from '@/server/session';
import { AccessDenied } from '@/modules/organizations/policy';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { listOpportunities } from '@/modules/crm/repository';
import { quotationDraftInput, quotationIdInput, quotationPricingInput } from './input';
import {
  approveQuotation,
  createDraftQuotation,
  formatMoney,
  listQuotations,
  updateDraftQuotationPricing,
} from './repository';

export async function getQuotationsPage(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  const [quotations, pipeline] = await Promise.all([
    listQuotations(workspace.id, user.id),
    listOpportunities(workspace.id, user.id),
  ]);
  return {
    workspace,
    quotations: quotations.map((row) => ({
      ...row,
      totalLabel: formatMoney(row.currency, row.totalMinor),
    })),
    opportunities: pipeline.opportunities
      .filter((row) => row.status === 'open')
      .map((row) => ({
        id: row.id,
        title: row.title,
        contactName: row.contactName,
      })),
  };
}

export async function createQuotationDraft(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = quotationDraftInput.parse(raw);
  await limitMutation(user.id);
  return createDraftQuotation(workspace.id, user.id, input);
}

export async function approveQuotationDraft(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = quotationIdInput.parse(raw);
  await limitMutation(user.id);
  return approveQuotation(workspace.id, user.id, input.quotationId);
}

export async function priceQuotationDraft(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = quotationPricingInput.parse(raw);
  await limitMutation(user.id);
  return updateDraftQuotationPricing(workspace.id, user.id, input);
}
