import { cn } from '@/lib/utils';
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap',
        tone === 'success'
          ? 'bg-emerald-50 text-emerald-800'
          : tone === 'warning'
            ? 'bg-amber-50 text-amber-800'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}
