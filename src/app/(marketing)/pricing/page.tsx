import { SupportingPage } from '@/components/marketing/supporting-page';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Pricing',
  'No published plans. No invented prices. Let’s understand your business before discussing availability and future pricing.',
  '/pricing',
);
export default function Page() {
  return (
    <SupportingPage
      kind="pricing"
      title="Start with a conversation."
      description="No published plans. No invented prices. Let’s understand your business before discussing availability and future pricing."
    />
  );
}
