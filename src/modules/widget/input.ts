import { z } from 'zod';
import { normalizeOrigin } from './origin';

export const widgetSettingsInput = z.object({
  enabled: z
    .union([z.literal('on'), z.literal('true'), z.literal('false'), z.boolean()])
    .transform((value) => value === true || value === 'on' || value === 'true'),
  allowedOrigins: z
    .string()
    .trim()
    .max(4000)
    .transform((value, ctx) => {
      const lines = value
        .split(/[\n,]+/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length > 20) {
        ctx.addIssue({ code: 'custom', message: 'Add at most 20 website origins.' });
        return z.NEVER;
      }
      const origins: string[] = [];
      for (const line of lines) {
        const origin = normalizeOrigin(line);
        if (!origin) {
          ctx.addIssue({
            code: 'custom',
            message: 'Each origin must be an http(s) website address without credentials.',
          });
          return z.NEVER;
        }
        origins.push(origin);
      }
      return [...new Set(origins)];
    }),
  revision: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export type WidgetSettingsInput = z.infer<typeof widgetSettingsInput>;

export const visitorMessageInput = z.object({
  message: z.string().trim().min(2).max(2000),
  requestId: z.uuid(),
});
export const visitorLeadInput = z.object({
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
  consent: z.literal(true),
  requestId: z.uuid(),
});

export interface WidgetSettings {
  publicKey: string;
  enabled: boolean;
  allowedOrigins: string[];
  revision: number;
  updatedAt: string;
  employeeReady: boolean;
  aiAvailable: boolean;
}
export interface InboxLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  consentAt: string;
  createdAt: string;
  conversationId: string;
  latestVisitorMessage: string | null;
  latestEmployeeMessage: string | null;
  messageCount: number;
}
export interface InboxConversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  hasLead: boolean;
  controlMode: 'ai' | 'human';
  needsHuman: boolean;
  requestContact: boolean;
  assigneeId: string | null;
  latestVisitorMessage: string | null;
  latestEmployeeMessage: string | null;
}

export interface ConversationDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  origin: string;
  status: string;
  controlMode: 'ai' | 'human';
  needsHuman: boolean;
  requestContact: boolean;
  assigneeId: string | null;
  takenOverAt: string | null;
  qualificationNotes: string;
  hasLead: boolean;
  leadId: string | null;
  messages: Array<{
    id: string;
    role: 'visitor' | 'employee' | 'human';
    content: string;
    grounded: boolean | null;
    status: string | null;
    actorId: string | null;
    createdAt: string;
  }>;
}

export const humanReplyInput = z.object({
  content: z.string().trim().min(1).max(4000),
});
export interface PublicBootstrap {
  organizationName: string;
  employeeName: string;
  enabled: boolean;
  available: boolean;
}
export interface PublicMessage {
  role: 'visitor' | 'employee';
  content: string;
  grounded?: boolean;
  createdAt: string;
}

export class WidgetUnavailable extends Error {
  constructor(message = 'Website chat is unavailable for this business.') {
    super(message);
  }
}
export class WidgetConflict extends Error {
  constructor() {
    super('Website installation settings changed while you were editing. Reload and try again.');
  }
}
export class VisitorDenied extends Error {
  constructor(message = 'This chat session is not allowed from this website.') {
    super(message);
  }
}
