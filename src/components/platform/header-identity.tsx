import { getPlatformSettings } from '@/modules/platform/operations-repository';
import type { PlatformRole } from '@/modules/platform/repository';

/** Non-blocking header label — loaded in Suspense so page data can start immediately. */
export async function PlatformHeaderIdentity({ platformRole }: { platformRole: PlatformRole }) {
  const settings = await getPlatformSettings();
  return (
    <span className="hidden text-xs text-muted-foreground sm:inline">
      {settings.identity} ·{' '}
      {platformRole === 'super-admin' ? 'Super Admin' : 'Platform Admin'}
    </span>
  );
}
