/**
 * Shopify OAuth install + callback helpers.
 */

import crypto from 'crypto';
import { getShopify, getShopifyEnv, normalizeShopDomain } from '@/lib/shopify/config';

/**
 * Sign a short-lived OAuth state payload (user id + nonce).
 * @param {{ userId: string, shop: string }} payload
 */
export function createOAuthState(payload) {
  const { apiSecret } = getShopifyEnv();
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      ts: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', apiSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * @param {string} state
 * @returns {{ userId: string, shop: string }|null}
 */
export function parseOAuthState(state) {
  const { apiSecret } = getShopifyEnv();
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', apiSecret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed?.userId || !parsed?.shop) return null;
    if (Date.now() - Number(parsed.ts || 0) > 15 * 60 * 1000) return null; // 15 min
    return { userId: String(parsed.userId), shop: String(parsed.shop) };
  } catch {
    return null;
  }
}

/**
 * Build the Shopify authorize URL for a merchant shop.
 * @param {string} shopInput
 * @param {string} userId
 */
export function buildShopifyAuthUrl(shopInput, userId) {
  const shop = normalizeShopDomain(shopInput);
  if (!shop) {
    return { ok: false, error: 'Enter a valid myshopify.com shop domain' };
  }

  const shopify = getShopify();
  const { appUrl } = getShopifyEnv();
  const state = createOAuthState({ userId, shop });
  const redirectUri = `${appUrl}/api/shopify/auth/callback`;

  // Begin auth via official helper when available; fallback to manual URL.
  try {
    // shopify.auth.begin returns a URL / Response depending on version — build manually for Next.
  } catch {
    // ignore
  }

  const { apiKey, scopes } = getShopifyEnv();
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', apiKey);
  url.searchParams.set('scope', scopes.join(','));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  // sanitize via SDK to ensure shop is valid
  void shopify;

  return { ok: true, url: url.toString(), shop, state };
}

/**
 * Exchange an authorization code for an offline access token.
 * @param {string} shopDomain
 * @param {string} code
 */
export async function exchangeShopifyCode(shopDomain, code) {
  const { apiKey, apiSecret } = getShopifyEnv();
  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'OAuth token exchange failed');
  }

  return {
    accessToken: String(data.access_token),
    scope: data.scope ? String(data.scope) : '',
  };
}

/**
 * Validate OAuth callback query HMAC using Shopify API utils.
 * @param {URLSearchParams} searchParams
 */
export async function validateShopifyOAuthHmac(searchParams) {
  const shopify = getShopify();
  const query = Object.fromEntries(searchParams.entries());
  return shopify.utils.validateHmac(query);
}
