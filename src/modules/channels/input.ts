import { z } from 'zod';

export const channelProviders = ['website_widget', 'email', 'whatsapp'] as const;
export type ChannelProvider = (typeof channelProviders)[number];

export const channelConfigInput = z.object({
  provider: z.enum(['email', 'whatsapp']),
  displayName: z.string().trim().min(2).max(80),
  fromAddress: z.string().trim().email().max(254).optional().or(z.literal('')),
  replyToAddress: z.string().trim().email().max(254).optional().or(z.literal('')),
  phoneNumberId: z.string().trim().max(80).optional().or(z.literal('')),
  businessAccountId: z.string().trim().max(80).optional().or(z.literal('')),
  // Optional credential material is accepted only to mark hasCredentials; live send remains blocked.
  credentialSecret: z.string().trim().min(8).max(2000).optional().or(z.literal('')),
});

export class ChannelUnavailable extends Error {
  constructor(message = 'Channel unavailable.') {
    super(message);
  }
}
