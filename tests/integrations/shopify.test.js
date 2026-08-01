import { describe, it, expect } from 'vitest';
import { ShopifyIntegration } from '@/lib/integrations/platforms/shopify';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const shopify = new ShopifyIntegration();

describe('ShopifyIntegration', () => {
  it('detects Shopify contact form payload', () => {
    expect(shopify.detectPayload({
      shop_domain: 'store.myshopify.com',
      'contact[name]': 'Jane',
      'contact[email]': 'jane@store.com',
    })).toBe(true);
  });

  it('normalizes contact[field] syntax', () => {
    const result = shopify.normalizePayload({
      shop_domain: 'acme.myshopify.com',
      'contact[name]': 'Jane Doe',
      'contact[email]': 'jane@acme.com',
      'contact[body]': 'Question about shipping',
    });
    expect(result.shop).toBe('acme.myshopify.com');
    expect(result.name).toBe('Jane Doe');
    expect(result.email).toBe('jane@acme.com');
    expect(result.body).toBe('Question about shipping');
    expect(result.source).toBe('shopify');
  });

  it('normalizes customer object from Flow', () => {
    const result = shopify.normalizePayload({
      myshopify_domain: 'shop.myshopify.com',
      customer: {
        email: 'cust@shop.com',
        first_name: 'John',
        last_name: 'Smith',
      },
    });
    expect(result.customer_email).toBe('cust@shop.com');
    expect(result.customer_first_name).toBe('John');
  });

  it('parseAndNormalizeBody with shopify header', () => {
    const headers = new Headers({ [PLATFORM_HEADER]: 'shopify' });
    const result = parseAndNormalizeBody(
      JSON.stringify({ 'contact[email]': 'test@shop.com' }),
      headers
    );
    expect(result.platform).toBe('shopify');
    expect(JSON.parse(result.body).email).toBe('test@shop.com');
  });
});
