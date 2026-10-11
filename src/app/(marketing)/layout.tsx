import type { Metadata } from 'next';
import { publicSiteUrl } from '@/lib/public-site';
import { MarketingShell } from '@/components/marketing/shell';
import './marketing.css';
import './homepage.css';
export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl()),
  robots: { index: true, follow: true },
  twitter: { card: 'summary_large_image' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
