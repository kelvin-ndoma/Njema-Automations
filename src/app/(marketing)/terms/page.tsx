import { SupportingPage } from '@/components/marketing/supporting-page';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Preview terms',
  'This is a development preview, with a working workspace foundation and planned AI sales capabilities.',
  '/terms',
);
export default function Page() {
  return (
    <SupportingPage
      kind="terms"
      title="A clear understanding before you begin."
      description="This is a development preview, with a working workspace foundation and planned AI sales capabilities."
    />
  );
}
