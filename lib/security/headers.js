/**
 * Security response headers applied to all routes via middleware.
 * CSP is tuned for Next.js App Router (inline styles required by Tailwind).
 */

import { getGaCspDirectives } from '@/lib/analytics/ga';

const isDev = process.env.NODE_ENV !== 'production';
const gaCsp = getGaCspDirectives();

/** @type {Record<string, string>} */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-DNS-Prefetch-Control': 'off',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  ...(isDev
    ? {}
    : {
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      }),
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : '') + gaCsp.scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:" + gaCsp.imgSrc,
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co" + gaCsp.connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; '),
};

export function applySecurityHeaders(response) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
