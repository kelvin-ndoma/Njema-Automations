'use client';
import { useActionState } from 'react';
import { saveChannelAction } from '@/modules/channels/actions';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function EmailChannelForm({
  slug,
  editable,
  channel,
}: {
  slug: string;
  editable: boolean;
  channel: {
    displayName: string;
    status: string;
    hasCredentials: boolean;
    config: { fromAddress?: string | null; replyToAddress?: string | null };
    activationNote: string;
  };
}) {
  const [state, action, pending] = useActionState(saveChannelAction.bind(null, slug, 'email'), {});
  if (!editable) return null;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">Email</h2>
      <p className="text-xs text-muted-foreground">{channel.activationNote}</p>
      <p className="text-xs capitalize text-muted-foreground">
        Status: {channel.status}
        {channel.hasCredentials ? ' · credentials stored' : ''}
      </p>
      <Input
        name="displayName"
        defaultValue={channel.displayName}
        required
        minLength={2}
        maxLength={80}
        placeholder="Display name"
      />
      <Input
        name="fromAddress"
        type="email"
        defaultValue={channel.config.fromAddress ?? ''}
        required
        placeholder="From address"
      />
      <Input
        name="replyToAddress"
        type="email"
        defaultValue={channel.config.replyToAddress ?? ''}
        placeholder="Reply-to (optional)"
      />
      <Input
        name="credentialSecret"
        type="password"
        autoComplete="off"
        placeholder="Provider API secret (optional, stored encrypted)"
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save email configuration'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Saved. Live outbound email remains blocked until a provider is verified.
        </p>
      )}
    </form>
  );
}

export function WhatsAppChannelForm({
  slug,
  editable,
  channel,
}: {
  slug: string;
  editable: boolean;
  channel: {
    displayName: string;
    status: string;
    hasCredentials: boolean;
    config: { phoneNumberId?: string | null; businessAccountId?: string | null };
    activationNote: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveChannelAction.bind(null, slug, 'whatsapp'),
    {},
  );
  if (!editable) return null;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">WhatsApp</h2>
      <p className="text-xs text-muted-foreground">{channel.activationNote}</p>
      <p className="text-xs capitalize text-muted-foreground">
        Status: {channel.status}
        {channel.hasCredentials ? ' · credentials stored' : ''}
      </p>
      <Input
        name="displayName"
        defaultValue={channel.displayName}
        required
        minLength={2}
        maxLength={80}
        placeholder="Display name"
      />
      <Input
        name="phoneNumberId"
        defaultValue={channel.config.phoneNumberId ?? ''}
        required
        placeholder="Phone number id"
      />
      <Input
        name="businessAccountId"
        defaultValue={channel.config.businessAccountId ?? ''}
        placeholder="Business account id (optional)"
      />
      <Input
        name="credentialSecret"
        type="password"
        autoComplete="off"
        placeholder="Provider access token (optional, stored encrypted)"
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save WhatsApp configuration'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Saved. Live WhatsApp messaging remains blocked until the provider is verified.
        </p>
      )}
    </form>
  );
}
