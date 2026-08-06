import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ENABLED_TOPICS,
  REQUIRED_SHOPIFY_TOPICS,
  SELECTABLE_SHOPIFY_TOPICS,
  isNotifiableTopic,
  mapShopifyWebhookToPayload,
  resolveTopicsToRegister,
} from '@/lib/shopify/topics';

describe('Shopify topics', () => {
  it('exposes selectable order/customer/refund/checkout events', () => {
    const ids = SELECTABLE_SHOPIFY_TOPICS.map((t) => t.id);
    expect(ids).toContain('orders/create');
    expect(ids).toContain('refunds/create');
    expect(ids).toContain('checkouts/update');
    expect(ids).not.toContain('app/uninstalled');
  });

  it('always registers GDPR and uninstall topics', () => {
    const registered = resolveTopicsToRegister(['orders/create']);
    for (const topic of REQUIRED_SHOPIFY_TOPICS) {
      expect(registered).toContain(topic);
    }
    expect(registered).toContain('orders/create');
  });

  it('filters unknown topics from selection', () => {
    const registered = resolveTopicsToRegister(['orders/create', 'evil/topic']);
    expect(registered).not.toContain('evil/topic');
  });

  it('defaults include core commerce events', () => {
    expect(DEFAULT_ENABLED_TOPICS).toEqual(
      expect.arrayContaining(['orders/create', 'orders/paid', 'customers/create', 'refunds/create'])
    );
  });

  it('maps order payloads for notifications', () => {
    const payload = mapShopifyWebhookToPayload(
      'orders/create',
      {
        id: 1001,
        name: '#1001',
        email: 'buyer@example.com',
        total_price: '42.00',
        currency: 'USD',
        customer: { first_name: 'Ada', last_name: 'Lovelace' },
        line_items: [{ quantity: 2, title: 'Widget' }],
      },
      'acme.myshopify.com'
    );
    expect(payload.source).toBe('shopify');
    expect(payload.shop).toBe('acme.myshopify.com');
    expect(payload.event).toBe('orders/create');
    expect(payload.order_name).toBe('#1001');
    expect(payload.email).toBe('buyer@example.com');
    expect(payload.customer_name).toBe('Ada Lovelace');
    expect(payload.items).toContain('Widget');
  });

  it('maps abandoned checkout fields', () => {
    const payload = mapShopifyWebhookToPayload(
      'checkouts/update',
      {
        id: 9,
        email: 'cart@example.com',
        abandoned_checkout_url: 'https://acme.myshopify.com/checkouts/abc',
        total_price: '19.00',
      },
      'acme.myshopify.com'
    );
    expect(payload.abandoned_checkout_url).toContain('/checkouts/');
    expect(isNotifiableTopic('checkouts/update')).toBe(true);
    expect(isNotifiableTopic('app/uninstalled')).toBe(false);
  });
});
