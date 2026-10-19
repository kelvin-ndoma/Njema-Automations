'use client';
import { useActionState } from 'react';
import type { WidgetSettings } from '@/modules/widget/input';
import { saveWidget } from '@/modules/widget/actions';
import { Button } from './ui/button';

export function WidgetSettingsForm({
  slug,
  settings,
  loaderBase,
  editable,
}: {
  slug: string;
  settings: WidgetSettings | null;
  loaderBase: string;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveWidget.bind(null, slug), {});
  const origins = settings?.allowedOrigins.join('\n') ?? '';
  const snippet = settings
    ? `<script src="${loaderBase.replace(/\/$/, '')}/api/widget/loader?key=${settings.publicKey}" async></script>`
    : '';
  return (
    <div className="mt-6 space-y-8">
      <form action={action} className="space-y-5">
        <fieldset disabled={!editable || pending} className="space-y-5">
          <input type="hidden" name="revision" value={settings?.revision ?? 0} />
          <div>
            <label htmlFor="allowedOrigins" className="mb-2 block text-sm font-medium">
              Allowed website origins
            </label>
            <textarea
              id="allowedOrigins"
              name="allowedOrigins"
              rows={5}
              defaultValue={origins}
              placeholder={'https://www.example.com\nhttp://127.0.0.1:3100'}
              className="w-full rounded-lg border border-input p-3 font-mono text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              One exact http(s) origin per line. Paths, wildcards and credentials are not allowed.
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings?.enabled ?? false}
              className="mt-1"
            />
            <span>
              Enable website chat on the allowed origins
              <span className="mt-1 block text-xs text-muted-foreground">
                Requires at least one origin and a configured sales employee.
              </span>
            </span>
          </label>
          <Button type="submit">{pending ? 'Saving…' : 'Save website installation'}</Button>
        </fieldset>
        {state.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-sm text-primary">
            Website installation saved.
          </p>
        )}
      </form>
      {settings ? (
        <section className="space-y-3 rounded-xl border border-input p-5">
          <h2 className="text-lg font-semibold">Install on your website</h2>
          <p className="text-sm text-muted-foreground">
            Paste this snippet before the closing body tag on an allowed origin.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-6 break-all whitespace-pre-wrap">
            {snippet}
          </pre>
          <p className="text-xs text-muted-foreground">
            Installation key identifies your workspace only. Allowed origins authorize browser calls.
            {!settings.employeeReady && ' Configure your sales employee before visitors can chat.'}
            {settings.employeeReady &&
              !settings.aiAvailable &&
              ' Replies need an AI connection from your platform administrator.'}
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Save your first allowed origins to create an installation key and embed snippet.
        </p>
      )}
    </div>
  );
}
