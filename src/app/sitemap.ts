import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/public-site';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '/',
    '/features',
    '/how-it-works',
    '/solutions',
    '/pricing',
    '/contact',
    '/privacy',
    '/terms',
  ].map((path) => ({
    url: publicSiteUrl() + path,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
