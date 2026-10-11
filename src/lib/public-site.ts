// Public metadata configuration only; never loads database/authentication secrets.
export function publicSiteUrl() {
  const value = process.env.SITE_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Use an HTTP(S) public site origin without credentials.');
  return url.origin;
}
export function marketingMetadata(title: string, description: string, path: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website' as const,
      siteName: 'Relay Sales',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}
