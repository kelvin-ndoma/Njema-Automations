import { SupportingPage } from '@/components/marketing/supporting-page';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'How it works',
  'Create the business foundation today. Explore the AI workflow we’re building next.',
  '/how-it-works',
);
export default function Page() {
  return (
    <SupportingPage
      kind="how-it-works"
      title="A clear path from hello to handoff."
      description="Create the business foundation today. Explore the AI workflow we’re building next."
    />
  );
}
