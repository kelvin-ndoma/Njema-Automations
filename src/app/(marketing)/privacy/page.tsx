import { SupportingPage } from '@/components/marketing/supporting-page';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Privacy notice',
  'A plain-language notice for this development preview and its inquiry form.',
  '/privacy',
);
export default function Page() {
  return (
    <SupportingPage
      kind="privacy"
      title="Your information deserves clarity."
      description="A plain-language notice for this development preview and its inquiry form."
    />
  );
}
