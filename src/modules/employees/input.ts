import { z } from 'zod';

export const salesAgentActions = [
  'continue',
  'request_contact',
  'escalate_human',
  'record_qualification',
  'advance_opportunity',
  'schedule_follow_up',
  'request_quotation',
  'request_appointment',
] as const;
export type SalesAgentAction = (typeof salesAgentActions)[number];

export const employeeInput = z.object({
  name: z.string().trim().min(2).max(80),
  instructions: z.string().trim().min(10).max(4000),
  knowledge: z.string().trim().min(20).max(20000),
  fallback: z.string().trim().min(10).max(500),
  goal: z.string().trim().min(10).max(2000),
  qualificationCriteria: z.string().trim().min(10).max(4000),
  escalationRules: z.string().trim().min(10).max(2000),
  allowedActions: z
    .union([z.array(z.enum(salesAgentActions)), z.string()])
    .transform((value, ctx) => {
      const list = Array.isArray(value)
        ? value
        : value
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean);
      const parsed = z.array(z.enum(salesAgentActions)).min(1).max(8).safeParse(list);
      if (!parsed.success) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose at least one allowed sales action.',
        });
        return z.NEVER;
      }
      return [...new Set(parsed.data)];
    }),
  revision: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export type EmployeeInput = z.infer<typeof employeeInput>;
export type EmployeeStatus = 'active' | 'paused';

export interface EmployeeConfiguration {
  name: string;
  instructions: string;
  knowledge: string;
  fallback: string;
  goal: string;
  qualificationCriteria: string;
  escalationRules: string;
  allowedActions: SalesAgentAction[];
  status: EmployeeStatus;
  revision: number;
  updatedAt: string;
}

export const employeeStatusInput = z.object({
  status: z.enum(['active', 'paused']),
  revision: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});

/** Defaults for configurations saved before L1 sales-agent fields existed. */
export const legacySalesAgentDefaults = {
  goal: 'Qualify the visitor’s needs and invite them to share contact details when appropriate.',
  qualificationCriteria:
    'Understand what the visitor needs, timeline, and whether they want a human follow-up.',
  escalationRules:
    'Escalate to a human when the visitor asks for pricing exceptions, legal advice, complaints, or an urgent call.',
  allowedActions: [...salesAgentActions] as SalesAgentAction[],
};

export class ConfigurationConflict extends Error {
  constructor() {
    super('This configuration changed while you were editing. Reload before saving again.');
  }
}
