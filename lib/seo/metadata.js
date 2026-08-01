import { SITE, absoluteUrl, pageTitle, getSiteUrl } from '@/lib/seo/site';

const DEFAULT_OG_IMAGE = '/opengraph-image';

/**
 * Build Next.js Metadata object for a page.
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.path='/']
 * @param {boolean} [options.noIndex=false]
 * @param {string} [options.ogImage]
 */
export function buildPageMetadata({
  title,
  description = SITE.description,
  path = '/',
  noIndex = false,
  ogImage = DEFAULT_OG_IMAGE,
} = {}) {
  const canonical = absoluteUrl(path);
  const resolvedTitle = title ? pageTitle(title) : pageTitle();
  const imageUrl = ogImage.startsWith('http') ? ogImage : absoluteUrl(ogImage);

  return {
    title: resolvedTitle,
    description,
    keywords: SITE.keywords,
    metadataBase: new URL(absoluteUrl()),
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: SITE.locale,
      url: canonical,
      siteName: SITE.name,
      title: resolvedTitle,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      images: [imageUrl],
      ...(SITE.twitterHandle ? { site: SITE.twitterHandle } : {}),
    },
  };
}

/** @returns {Array<{ url: string, lastModified: Date, changeFrequency: string, priority: number }>} */
export function buildSitemapEntries() {
  const now = new Date();
  const pages = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/refunds', priority: 0.6, changeFrequency: 'yearly' },
  ];

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

/** @returns {{ rules: object, sitemap: string, host?: string }} */
export function buildRobotsConfig() {
  const config = {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/login', '/api/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };

  const url = getSiteUrl();
  if (!url.includes('localhost')) {
    config.host = url;
  }

  return config;
}
