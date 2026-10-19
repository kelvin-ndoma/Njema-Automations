import { z } from 'zod';

export const contactInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value || undefined),
});

export const opportunityStageInput = z.object({
  opportunityId: z.string().min(1).max(40),
  stageKey: z.string().trim().min(1).max(48),
});

export const contactOptOutInput = z.object({
  contactId: z.string().min(1).max(40),
  communicationOptOut: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((value) => value === true || value === 'true'),
});

export type ContactInput = z.infer<typeof contactInput>;

export class ContactConflict extends Error {
  constructor() {
    super('A contact with this email already exists in this workspace.');
  }
}
