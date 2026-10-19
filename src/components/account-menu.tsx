'use client';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
export function AccountMenu({
  name,
  platformAccess = false,
  context = 'app',
}: {
  name: string;
  platformAccess?: boolean;
  /** When opened from the platform shell, keep navigation inside platform routes. */
  context?: 'app' | 'platform';
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  async function logout() {
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      router.replace('/sign-in');
    } catch {
      setError('Could not sign out. Please try again.');
    }
  }
  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger
          className="flex size-9 items-center justify-center rounded-full bg-[#e6ece5] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Account menu"
        >
          {name.slice(0, 1).toUpperCase()}
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-52 rounded-xl border border-input bg-background p-2 shadow-lg"
          >
            <Dropdown.Label className="px-2 py-2 text-sm font-medium">{name}</Dropdown.Label>
            <Dropdown.Separator className="my-1 h-px bg-input" />
            <Dropdown.Item asChild>
              <Link
                href={context === 'platform' ? '/platform/account' : '/account'}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-muted"
              >
                <UserRound size={15} /> Account
              </Link>
            </Dropdown.Item>
            {platformAccess && context !== 'platform' && (
              <Dropdown.Item asChild>
                <Link
                  href="/platform"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-muted"
                >
                  <ShieldCheck size={15} /> Platform control center
                </Link>
              </Dropdown.Item>
            )}
            {context === 'platform' && (
              <Dropdown.Item asChild>
                <Link
                  href="/organizations"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-muted"
                >
                  <UserRound size={15} /> My organization workspaces
                </Link>
              </Dropdown.Item>
            )}
            <Dropdown.Item
              onSelect={logout}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-muted"
            >
              <LogOut size={15} /> Sign out
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
