import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Shopify webhook HMAC + install helpers', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.SHOPIFY_API_KEY = 'test-api-key';
    process.env.SHOPIFY_API_SECRET = 'shopify-hmac-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    process.env.CREDENTIALS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.resetModules();
  });

  it('beginShopifyInstall requires configured app + encryption', async () => {
    const { beginShopifyInstall } = await import('@/lib/shopify/service');
    const result = beginShopifyInstall('user-1', 'acme.myshopify.com');
    expect(result.ok).toBe(true);
    expect(result.url).toContain('https://acme.myshopify.com/admin/oauth/authorize');
    expect(result.url).toContain('client_id=test-api-key');
    expect(result.url).toContain(encodeURIComponent('https://app.example.com/api/shopify/auth/callback'));
  });

  it('beginShopifyInstall rejects invalid shop', async () => {
    const { beginShopifyInstall } = await import('@/lib/shopify/service');
    const result = beginShopifyInstall('user-1', '!!!');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });
});
