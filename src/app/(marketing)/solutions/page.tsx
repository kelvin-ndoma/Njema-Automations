import { SupportingPage } from '@/components/marketing/supporting-page';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Solutions',
  'Every business has its own questions, context and next steps. These examples illustrate potential uses for the planned AI sales employee.',
  '/solutions',
);
export default function Page() {
  return (
    <SupportingPage
      kind="solutions"
      title="Many industries. One human starting point."
      description="Every business has its own questions, context and next steps. These examples illustrate potential uses for the planned AI sales employee."
    />
  );
}
