import { z } from 'zod';

export const quotationDraftInput = z.object({
  opportunityId: z.string().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(500),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitAmount: z.coerce.number().min(0).max(1000000),
  notes: z.string().trim().max(2000).optional().default(''),
});

export const quotationIdInput = z.object({
  quotationId: z.string().min(1).max(40),
});

export const quotationPricingInput = z.object({
  quotationId: z.string().min(1).max(40),
  description: z.string().trim().min(2).max(500),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitAmount: z.coerce.number().min(0).max(1000000),
  notes: z.string().trim().max(2000).optional().default(''),
});

export class QuotationUnavailable extends Error {
  constructor(message = 'Quotation unavailable.') {
    super(message);
  }
}
