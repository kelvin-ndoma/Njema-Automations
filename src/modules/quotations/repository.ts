import 'server-only';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership, Organization } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { AccessDenied, authorizeMembership } from '@/modules/organizations/policy';
import { Activity, Opportunity } from '@/modules/crm/models';
import { currencyDecimals, priceToMinor } from '@/modules/platform/operations-input';
import { Quotation } from './models';
import {
  QuotationUnavailable,
  type quotationDraftInput,
  type quotationPricingInput,
} from './input';
import type { z } from 'zod';

export async function listQuotations(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  const rows = await Quotation.find({ organizationId })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(50)
    .lean()
    .exec();
  return rows.map((row) => {
    const line = row.lines[0];
    return {
      id: String(row._id),
      opportunityId: String(row.opportunityId),
      title: row.title,
      status: row.status,
      currency: row.currency,
      description: line?.description ?? '',
      quantity: line?.quantity ?? 1,
      unitAmountMinor: line?.unitAmountMinor ?? 0,
      notes: row.notes ?? '',
      totalMinor: row.lines.reduce(
        (sum, item) => sum + item.quantity * item.unitAmountMinor,
        0,
      ),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function createDraftQuotation(
  organizationId: string,
  userId: string,
  input: z.infer<typeof quotationDraftInput>,
) {
  await connectDb();
  return Quotation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const org = await Organization.findById(organizationId).session(session).exec();
    if (!org) throw new AccessDenied();
    const opportunity = await Opportunity.findOne({
      _id: input.opportunityId,
      organizationId,
      status: 'open',
    })
      .session(session)
      .exec();
    if (!opportunity) throw new QuotationUnavailable('Open opportunity required.');
    const unitAmountMinor = priceToMinor(org.currency, input.unitAmount);
    if (unitAmountMinor === null) throw new QuotationUnavailable('Enter a valid amount.');
    const [quotation] = await Quotation.create(
      [
        {
          organizationId,
          opportunityId: opportunity._id,
          contactId: opportunity.contactId,
          currency: org.currency,
          status: 'draft',
          title: input.title,
          lines: [
            {
              description: input.description,
              quantity: input.quantity,
              unitAmountMinor,
            },
          ],
          notes: input.notes ?? '',
          createdBy: userId,
        },
      ],
      { session },
    );
    if (opportunity.stageKey === 'qualified' || opportunity.stageKey === 'new') {
      opportunity.stageKey = 'proposal';
      await opportunity.save({ session });
    }
    await Activity.create(
      [
        {
          organizationId,
          contactId: opportunity.contactId,
          opportunityId: opportunity._id,
          type: 'system',
          body: `Draft quotation created: ${input.title}.`,
          actorId: userId,
        },
      ],
      { session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'quotation.draft_created',
          resourceId: String(quotation._id),
        },
      ],
      { session },
    );
    return { id: String(quotation._id) };
  });
}

export async function updateDraftQuotationPricing(
  organizationId: string,
  userId: string,
  input: z.infer<typeof quotationPricingInput>,
) {
  await connectDb();
  return Quotation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const org = await Organization.findById(organizationId).session(session).exec();
    if (!org) throw new AccessDenied();
    const unitAmountMinor = priceToMinor(org.currency, input.unitAmount);
    if (unitAmountMinor === null) throw new QuotationUnavailable('Enter a valid amount.');
    if (unitAmountMinor <= 0)
      throw new QuotationUnavailable('Set a positive price before approving AI-requested drafts.');
    const row = await Quotation.findOneAndUpdate(
      { _id: input.quotationId, organizationId, status: 'draft' },
      {
        $set: {
          lines: [
            {
              description: input.description,
              quantity: input.quantity,
              unitAmountMinor,
            },
          ],
          notes: input.notes ?? '',
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new QuotationUnavailable('Only draft quotations can be priced.');
    await Activity.create(
      [
        {
          organizationId,
          contactId: row.contactId,
          opportunityId: row.opportunityId,
          type: 'system',
          body: `Quotation pricing updated: ${row.title}.`,
          actorId: userId,
        },
      ],
      { session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'quotation.pricing_updated',
          resourceId: input.quotationId,
        },
      ],
      { session },
    );
    return { id: input.quotationId };
  });
}

export async function approveQuotation(
  organizationId: string,
  userId: string,
  quotationId: string,
) {
  await connectDb();
  return Quotation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const existing = await Quotation.findOne({
      _id: quotationId,
      organizationId,
      status: 'draft',
    })
      .session(session)
      .exec();
    if (!existing) throw new QuotationUnavailable('Only draft quotations can be approved.');
    const total = existing.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitAmountMinor,
      0,
    );
    if (total <= 0)
      throw new QuotationUnavailable('Set a positive price before approving this quotation.');
    const row = await Quotation.findOneAndUpdate(
      { _id: quotationId, organizationId, status: 'draft' },
      {
        $set: {
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new QuotationUnavailable('Only draft quotations can be approved.');
    await Activity.create(
      [
        {
          organizationId,
          contactId: row.contactId,
          opportunityId: row.opportunityId,
          type: 'system',
          body: `Quotation approved: ${row.title}. Customer send is not configured.`,
          actorId: userId,
        },
      ],
      { session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'quotation.approved',
          resourceId: quotationId,
        },
      ],
      { session },
    );
    return { id: quotationId, status: 'approved' as const };
  });
}

export function formatMoney(currency: string, minor: number) {
  const decimals = currencyDecimals(currency);
  const major = minor / 10 ** decimals;
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(major);
}
