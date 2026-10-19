import 'server-only';
import { createHash, createCipheriv, randomBytes } from 'node:crypto';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { getEnv } from '@/server/env';
import { AuditEvent, Membership } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { authorizeMembership } from '@/modules/organizations/policy';
import { WidgetInstallation } from '@/modules/widget/models';
import { ChannelConnection } from './models';
import { ChannelUnavailable, type channelConfigInput } from './input';
import type { z } from 'zod';

function sealCredential(secret: string) {
  // AES-256-GCM using a key derived from BETTER_AUTH_SECRET. Live providers still blocked.
  const key = createHash('sha256').update(`relay-channel:${getEnv().BETTER_AUTH_SECRET}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export async function listChannelConnections(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  await connectDb();
  const [rows, widget] = await Promise.all([
    ChannelConnection.find({ organizationId }).sort({ provider: 1 }).lean().exec(),
    WidgetInstallation.findOne({ organizationId }).lean().exec(),
  ]);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  const website = byProvider.get('website_widget');
  const websiteStatus = widget?.enabled
    ? ('active' as const)
    : widget
      ? ('configured' as const)
      : ('disconnected' as const);

  const catalog = [
    {
      provider: 'website_widget' as const,
      displayName: website?.displayName ?? 'Website chat',
      status: websiteStatus,
      hasCredentials: true,
      config: {
        originCount: widget?.allowedOrigins?.length ?? 0,
      },
      lastError: website?.lastError ?? null,
      activationBlocked: false,
      activationNote: widget?.enabled
        ? 'Live on allowed website origins.'
        : 'Configure Website installation to enable.',
    },
    {
      provider: 'email' as const,
      displayName: byProvider.get('email')?.displayName ?? 'Email',
      status: (byProvider.get('email')?.status as
        | 'disconnected'
        | 'configured'
        | 'active'
        | 'error') ?? 'disconnected',
      hasCredentials: byProvider.get('email')?.hasCredentials === true,
      config: {
        fromAddress: byProvider.get('email')?.config?.fromAddress ?? null,
        replyToAddress: byProvider.get('email')?.config?.replyToAddress ?? null,
      },
      lastError: byProvider.get('email')?.lastError ?? null,
      activationBlocked: true,
      activationNote:
        'Outbound email provider and verified domain are required before live delivery.',
    },
    {
      provider: 'whatsapp' as const,
      displayName: byProvider.get('whatsapp')?.displayName ?? 'WhatsApp',
      status: (byProvider.get('whatsapp')?.status as
        | 'disconnected'
        | 'configured'
        | 'active'
        | 'error') ?? 'disconnected',
      hasCredentials: byProvider.get('whatsapp')?.hasCredentials === true,
      config: {
        phoneNumberId: byProvider.get('whatsapp')?.config?.phoneNumberId ?? null,
        businessAccountId: byProvider.get('whatsapp')?.config?.businessAccountId ?? null,
      },
      lastError: byProvider.get('whatsapp')?.lastError ?? null,
      activationBlocked: true,
      activationNote:
        'Meta WhatsApp Business API credentials and webhook verification are required before live messaging.',
    },
  ];

  return catalog;
}

export async function saveChannelConfiguration(
  organizationId: string,
  userId: string,
  input: z.infer<typeof channelConfigInput>,
) {
  await connectDb();
  return ChannelConnection.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );

    if (input.provider === 'email' && !input.fromAddress) {
      throw new ChannelUnavailable('Email channels require a from address.');
    }
    if (input.provider === 'whatsapp' && !input.phoneNumberId) {
      throw new ChannelUnavailable('WhatsApp channels require a phone number id.');
    }

    const secret = input.credentialSecret?.trim() ?? '';
    const hasNewSecret = secret.length >= 8;
    const existing = await ChannelConnection.findOne({
      organizationId,
      provider: input.provider,
    })
      .session(session)
      .exec();

    const credentialCiphertext = hasNewSecret
      ? sealCredential(secret)
      : (existing?.credentialCiphertext ?? null);
    const hasCredentials = !!(credentialCiphertext || existing?.hasCredentials);

    // Never mark email/whatsapp active without a verified live provider integration.
    const status = hasCredentials ? ('configured' as const) : ('disconnected' as const);

    const row = await ChannelConnection.findOneAndUpdate(
      { organizationId, provider: input.provider },
      {
        $set: {
          displayName: input.displayName,
          status,
          hasCredentials,
          credentialCiphertext,
          lastError: hasCredentials
            ? 'Live activation blocked until the provider integration is verified.'
            : null,
          lastValidatedAt: new Date(),
          updatedBy: userId,
          config: {
            fromAddress: input.fromAddress || null,
            replyToAddress: input.replyToAddress || null,
            phoneNumberId: input.phoneNumberId || null,
            businessAccountId: input.businessAccountId || null,
            webhookUrl: null,
          },
        },
      },
      { upsert: true, session, returnDocument: 'after' },
    ).exec();

    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'channel.configuration.saved',
          resourceId: String(row!._id),
        },
      ],
      { session },
    );

    return {
      provider: input.provider,
      status,
      hasCredentials,
      activationBlocked: true,
    };
  });
}

/** Explicit refusal — never invent successful outbound delivery. */
export async function attemptOutboundSend(input: {
  organizationId: string;
  provider: 'email' | 'whatsapp';
  to: string;
  body: string;
}): Promise<never> {
  void input;
  throw new ChannelUnavailable(
    'Outbound messaging is not activated. Configure a verified provider before sending.',
  );
}
