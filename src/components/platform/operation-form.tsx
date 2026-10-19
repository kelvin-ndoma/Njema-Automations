'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { platformOperation } from '@/modules/platform/operations-actions';
import { Button } from '@/components/ui/button';

export function OperationForm({
  operation,
  hidden = {},
  label,
  children,
  sensitive = false,
}: {
  operation: string;
  hidden?: Record<string, string>;
  label: string;
  children?: React.ReactNode;
  sensitive?: boolean;
}) {
  const [state, action, pending] = useActionState(platformOperation, {});
  const content = (
    <form action={action} className="space-y-4">
      <input type="hidden" name="operation" value={operation} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset disabled={pending} className="space-y-4">
        {children}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : label}
        </Button>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Operation saved.
        </p>
      )}
      {state.success && operation === 'support.enter' && state.resourceId && (
        <Link
          className="inline-block font-medium text-primary underline"
          href={`/platform/support/access/${state.resourceId}`}
        >
          Open read-only support workspace
        </Link>
      )}
    </form>
  );
  if (!sensitive) return content;
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-input bg-background p-6 shadow-xl">
          <Dialog.Title className="pr-8 text-xl font-semibold">{label}</Dialog.Title>
          <Dialog.Description className="mb-5 mt-2 text-sm text-muted-foreground">
            This privileged change is audited. Confirm the target and provide a reason.
          </Dialog.Description>
          <Dialog.Close aria-label="Close operation" className="absolute right-4 top-4 p-1">
            <X size={18} />
          </Dialog.Close>
          {content}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
