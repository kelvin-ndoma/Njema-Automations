'use client';
import { useActionState } from 'react';
import { createContactAction } from '@/modules/crm/actions';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function CrmContactForm({ slug, editable }: { slug: string; editable: boolean }) {
  const [state, action, pending] = useActionState(createContactAction.bind(null, slug), {});
  if (!editable) return null;
  return (
    <form action={action} className="space-y-4 rounded-xl border border-input p-5">
      <h2 className="text-sm font-semibold">Add contact</h2>
      <div>
        <label htmlFor="contact-name" className="mb-2 block text-sm font-medium">
          Name
        </label>
        <Input id="contact-name" name="name" required minLength={2} maxLength={80} />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-2 block text-sm font-medium">
          Email
        </label>
        <Input id="contact-email" name="email" type="email" required maxLength={254} />
      </div>
      <div>
        <label htmlFor="contact-phone" className="mb-2 block text-sm font-medium">
          Phone (optional)
        </label>
        <Input id="contact-phone" name="phone" maxLength={40} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save contact'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          Contact saved.
        </p>
      )}
    </form>
  );
}
