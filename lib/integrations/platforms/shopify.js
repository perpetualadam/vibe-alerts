import { PlatformIntegration } from './base';

export class ShopifyIntegration extends PlatformIntegration {
  static id = 'shopify';
  static label = 'Shopify';
  static description = 'Shopify contact forms and Flow HTTP requests';
  static version = '1.0.0';
  static setupSteps = [
    'Option A — Shopify Flow: Add "Send HTTP request" action on customer/contact events.',
    'URL: your VibeAlerts webhook. Method: POST. Body: JSON.',
    'Headers: X-VibeAlerts-Platform: shopify, X-VibeAlerts-Key: your API key.',
    'Option B — Theme contact form: use integrations/shopify/vibe-alerts-contact.liquid snippet.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'shopify') return true;
    if (d.shop_domain || d.myshopify_domain) return true;
    if (d.contact_form || d['contact[email]']) return true;
    if (d.customer && typeof d.customer === 'object') return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'shopify' };

    if (data.shop_domain) out.shop = String(data.shop_domain);
    if (data.myshopify_domain) out.shop = String(data.myshopify_domain);

    // Shopify contact form fields: contact[email], contact[name], etc.
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      const match = key.match(/^contact\[(.+)\]$/);
      const normalizedKey = match ? match[1] : key.replace(/^contact_/, '');
      if (typeof value === 'object') {
        out[normalizedKey] = JSON.stringify(value);
      } else {
        out[normalizedKey] = String(value);
      }
    }

    if (data.customer && typeof data.customer === 'object') {
      const c = /** @type {Record<string, unknown>} */ (data.customer);
      if (c.email) out.customer_email = String(c.email);
      if (c.first_name) out.customer_first_name = String(c.first_name);
      if (c.last_name) out.customer_last_name = String(c.last_name);
    }

    return out;
  }
}

export const shopifyIntegration = new ShopifyIntegration();
