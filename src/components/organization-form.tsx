'use client';
import { useActionState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { createOrganization } from '@/modules/organizations/actions';
import { Input } from './ui/input';
import { Button } from './ui/button';
export function OrganizationForm() {
 const [state, action, pending] = useActionState(createOrganization, {});
 return <form action={action} className="space-y-5">
  <div><label htmlFor="name" className="mb-2 block text-sm font-medium">Business name</label><Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Your business" /></div>
  <div><label htmlFor="slug" className="mb-2 block text-sm font-medium">Workspace address</label><Input id="slug" name="slug" required minLength={3} maxLength={48} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="your-business" /><p className="mt-2 text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens. Used in your workspace URL.</p></div>
  <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="currency" className="mb-2 block text-sm font-medium">Currency</label><select id="currency" name="currency" required defaultValue=""><option value="" disabled>Select currency</option>{Intl.supportedValuesOf('currency').map(v => <option key={v}>{v}</option>)}</select></div><div><label htmlFor="locale" className="mb-2 block text-sm font-medium">Locale</label><Input id="locale" name="locale" required placeholder="e.g. en-GB" /><p className="mt-1 text-xs text-muted-foreground">Language and regional formatting.</p></div></div>
  <div><label htmlFor="timeZone" className="mb-2 block text-sm font-medium">Business time zone</label><select id="timeZone" name="timeZone" required defaultValue=""><option value="" disabled>Select time zone</option><option value="UTC">UTC</option>{Intl.supportedValuesOf('timeZone').map(v => <option key={v}>{v}</option>)}</select></div>
  {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
  <Button className="w-full" disabled={pending}>{pending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />} Create workspace</Button>
 </form>;
}
