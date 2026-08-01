/**
 * Central site configuration for SEO, AEO, and LLMO.
 * Uses NEXT_PUBLIC_APP_URL — no server secret validation required.
 */

export const SITE = {
  name: 'VibeAlerts',
  legalName: 'VibeAlerts',
  tagline: 'Website forms → Telegram alerts',
  description:
    'VibeAlerts routes website form submissions to Telegram, Email, Slack, and more. Works with WordPress, Wix, Webflow, Shopify, Typeform, Google Forms, and any site that can POST JSON.',
  locale: 'en_US',
  twitterHandle: '@vibealerts',
  category: 'BusinessApplication',
  keywords: [
    'form to telegram',
    'website form alerts',
    'webhook form integration',
    'wordpress telegram',
    'wix form notifications',
    'lead alerts',
    'form webhook saas',
  ],
};

/**
 * @returns {string} Canonical site URL without trailing slash
 */
export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function getSiteConfig() {
  return { ...SITE, url: getSiteUrl() };
}

/**
 * Build absolute URL for a path.
 * @param {string} [path='/']
 */
export function absoluteUrl(path = '/') {
  const base = getSiteUrl();
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * @param {string} path
 */
export function pageTitle(pathTitle) {
  if (!pathTitle) return `${SITE.name} — ${SITE.tagline}`;
  return `${pathTitle} | ${SITE.name}`;
}
