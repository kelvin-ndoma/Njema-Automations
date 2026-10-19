'use client';
import { useActionState } from 'react';
import type { Workspace } from '@/modules/organizations/service';
import { updateSettings } from '@/modules/organizations/actions';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function BusinessSettingsForm({
  workspace,
  currencies,
  timeZones,
  editable,
}: {
  workspace: Workspace;
  currencies: string[];
  timeZones: string[];
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(updateSettings.bind(null, workspace.slug), {});
  return (
    <form action={action} className="mt-6 space-y-5">
      <fieldset disabled={!editable || pending} className="space-y-5">
        <div>
          <label htmlFor="business-name" className="mb-2 block text-sm font-medium">
            Business name
          </label>
          <Input
            id="business-name"
            name="name"
            defaultValue={workspace.name}
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        <div>
          <label htmlFor="currency" className="mb-2 block text-sm font-medium">
            Currency
          </label>
          <select id="currency" name="currency" defaultValue={workspace.currency}>
            {currencies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="locale" className="mb-2 block text-sm font-medium">
            Locale
          </label>
          <Input
            id="locale"
            name="locale"
            defaultValue={workspace.locale}
            maxLength={35}
            required
          />
        </div>
        <div>
          <label htmlFor="timeZone" className="mb-2 block text-sm font-medium">
            Business time zone
          </label>
          <select id="timeZone" name="timeZone" defaultValue={workspace.timeZone}>
            {Array.from(new Set(['UTC', workspace.timeZone, ...timeZones])).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {editable && (
          <Button type="submit">{pending ? 'Saving…' : 'Save business settings'}</Button>
        )}
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Business settings saved.
        </p>
      )}
      {!editable && (
        <p className="text-sm text-muted-foreground">
          An owner or administrator can update business settings.
        </p>
      )}
    </form>
  );
}
