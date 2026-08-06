import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createOAuthState,
  parseOAuthState,
} from '@/lib/shopify/oauth';
import { normalizeShopDomain } from '@/lib/shopify/config';

describe('Shopify OAuth helpers', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.SHOPIFY_API_KEY = 'test-api-key';
    process.env.SHOPIFY_API_SECRET = 'test-api-secret-value';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('round-trips signed OAuth state', () => {
    const state = createOAuthState({
      userId: 'user-123',
      shop: 'acme.myshopify.com',
    });
    const parsed = parseOAuthState(state);
    expect(parsed).toEqual({
      userId: 'user-123',
      shop: 'acme.myshopify.com',
    });
  });

  it('rejects tampered OAuth state', () => {
    const state = createOAuthState({
      userId: 'user-123',
      shop: 'acme.myshopify.com',
    });
    expect(parseOAuthState(`${state}x`)).toBeNull();
    expect(parseOAuthState('not.valid')).toBeNull();
  });

  it('normalizes shop domains', () => {
    expect(normalizeShopDomain('acme.myshopify.com')).toBe('acme.myshopify.com');
    expect(normalizeShopDomain('https://Acme.myshopify.com/admin')).toBe('acme.myshopify.com');
    expect(normalizeShopDomain('acme')).toBe('acme.myshopify.com');
    expect(normalizeShopDomain('not a shop')).toBeNull();
  });
});
