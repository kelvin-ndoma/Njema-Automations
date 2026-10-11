import { SupportingPage } from '@/components/marketing/supporting-page';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Features & availability',
  'Explore the intended capabilities and the foundation you can use today.',
  '/features',
);
export default function Page() {
  return (
    <SupportingPage
      kind="features"
      title="A sales employee with purpose."
      description="Explore the intended capabilities and the foundation you can use today."
    />
  );
}
