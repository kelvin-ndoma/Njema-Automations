import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/public-site';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/platform',
        '/app/',
        '/organizations',
        '/account',
        '/api/',
        '/auth/',
        '/sign-in',
        '/sign-up',
      ],
    },
    sitemap: publicSiteUrl() + '/sitemap.xml',
  };
}
