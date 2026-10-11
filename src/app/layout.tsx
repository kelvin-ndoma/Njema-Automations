import type { Metadata } from 'next';
import { publicSiteUrl } from '@/lib/public-site';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl()),
  title: { default: 'Relay · AI sales workforce', template: '%s · Relay' },
  description: 'An intelligent AI sales workforce for modern businesses.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
