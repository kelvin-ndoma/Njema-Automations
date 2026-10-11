import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Relay · AI sales workforce', template: '%s · Relay' }, description: 'An intelligent AI sales workforce for modern businesses.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
