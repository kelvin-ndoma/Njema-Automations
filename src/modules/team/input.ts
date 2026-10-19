import { z } from 'zod';

export const inviteRoleOptions = ['admin', 'manager', 'agent', 'viewer'] as const;

export const teamInviteInput = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  role: z.enum(inviteRoleOptions),
});

export const invitationTokenInput = z.object({
  token: z.string().min(20).max(200),
});

export const membershipActionInput = z.object({
  membershipId: z.string().min(1).max(40),
});

export const membershipRoleInput = z.object({
  membershipId: z.string().min(1).max(40),
  role: z.enum(inviteRoleOptions),
});

export const invitationIdInput = z.object({
  invitationId: z.string().min(1).max(40),
});

export class TeamUnavailable extends Error {
  constructor(message = 'Team action unavailable.') {
    super(message);
  }
}
