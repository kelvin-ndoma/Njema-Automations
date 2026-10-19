import Link from 'next/link';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '', label: 'Contacts' },
  { href: '/pipeline', label: 'Pipeline' },
] as const;

export function CrmSubnav({
  slug,
  active,
}: {
  slug: string;
  active: 'contacts' | 'pipeline' | 'contact';
}) {
  return (
    <nav aria-label="CRM sections" className="mt-6 flex flex-wrap gap-2 border-b border-input pb-3">
      {tabs.map((tab) => {
        const selected =
          (tab.href === '' && (active === 'contacts' || active === 'contact')) ||
          (tab.href === '/pipeline' && active === 'pipeline');
        return (
          <Link
            key={tab.href || 'contacts'}
            href={`/app/${slug}/crm${tab.href}`}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              selected ? 'bg-[#e0e9df] text-primary' : 'text-muted-foreground hover:bg-muted',
            )}
            aria-current={selected ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
