/**
 * Shopify App configuration from process.env (never hardcode secrets).
 */

import '@shopify/shopify-api/adapters/node';
import { ApiVersion, shopifyApi } from '@shopify/shopify-api';

const DEFAULT_SCOPES = [
  'read_orders',
  'read_customers',
  'read_checkouts',
  'read_merchant_managed_fulfillment_orders',
].join(',');

/**
 * @returns {{
 *   apiKey: string,
 *   apiSecret: string,
 *   scopes: string[],
 *   hostName: string,
 *   appUrl: string,
 *   apiVersion: string,
 *   configured: boolean,
 * }}
 */
export function getShopifyEnv() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  let hostName = '';
  try {
    hostName = appUrl ? new URL(appUrl).host : '';
  } catch {
    hostName = '';
  }

  const apiKey = process.env.SHOPIFY_API_KEY?.trim() || '';
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim() || '';
  const scopes = (process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    apiKey,
    apiSecret,
    scopes,
    hostName,
    appUrl,
    apiVersion: process.env.SHOPIFY_API_VERSION || ApiVersion.July25,
    configured: Boolean(apiKey && apiSecret && hostName),
  };
}

export function isShopifyAppConfigured() {
  return getShopifyEnv().configured;
}

/** @type {ReturnType<typeof shopifyApi>|null} */
let shopifyInstance = null;

/**
 * Lazily create the official Shopify API client.
 */
export function getShopify() {
  if (shopifyInstance) return shopifyInstance;
  const env = getShopifyEnv();
  if (!env.configured) {
    throw new Error(
      'Shopify App is not configured. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and NEXT_PUBLIC_APP_URL.'
    );
  }

  shopifyInstance = shopifyApi({
    apiKey: env.apiKey,
    apiSecretKey: env.apiSecret,
    scopes: env.scopes,
    hostName: env.hostName,
    apiVersion: /** @type {import('@shopify/shopify-api').ApiVersion} */ (env.apiVersion),
    isEmbeddedApp: false,
    // Future-proof billing flags left default — VibeAlerts bills via Stripe.
  });

  return shopifyInstance;
}

/**
 * Normalize / validate a shop domain.
 * @param {string} input
 * @returns {string|null} e.g. store.myshopify.com
 */
export function normalizeShopDomain(input) {
  const raw = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  if (!raw) return null;

  const domain = raw.includes('.') ? raw : `${raw}.myshopify.com`;

  try {
    const shopify = getShopify();
    return shopify.utils.sanitizeShop(domain, true) || null;
  } catch {
    return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) ? domain : null;
  }
}
