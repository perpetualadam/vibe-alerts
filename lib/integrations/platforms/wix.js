import { PlatformIntegration } from './base';

export class WixIntegration extends PlatformIntegration {
  static id = 'wix';
  static label = 'Wix';
  static description = 'Wix Forms, Wix Automations custom webhook, and Velo backend';
  static version = '1.0.0';
  static setupSteps = [
    'Option A — Wix Automations: New automation → Trigger: form submitted → Action: Send HTTP request.',
    'URL = your VibeAlerts Webhook URL. Method POST.',
    'Headers: X-VibeAlerts-Platform: wix and X-VibeAlerts-Key: your API key. Map form fields into JSON.',
    'Option B — Velo: copy integrations/wix/vibe-alerts.web.js into a backend web module.',
    'Publish the automation/site, then use Send Test Notification in the VibeAlerts dashboard.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'wix') return true;
    if (d.context?.metaSiteId || d.metaSiteId) return true;
    if (d.formName && (d.submissions || d.data)) return true;
    if (d.contact?.firstName !== undefined || d.contactId) return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'wix' };

    if (data.formName) out.form_name = String(data.formName);
    if (data.metaSiteId) out.site_id = String(data.metaSiteId);
    if (data.context && typeof data.context === 'object') {
      const ctx = /** @type {Record<string, unknown>} */ (data.context);
      if (ctx.metaSiteId) out.site_id = String(ctx.metaSiteId);
    }

    // Wix automation flat submission
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      Object.assign(out, this.flattenFields(data.data));
    }

    // submissions array (take first)
    if (Array.isArray(data.submissions) && data.submissions[0]) {
      Object.assign(out, this.flattenFields(data.submissions[0]));
    }

    // Wix contact object
    if (data.contact && typeof data.contact === 'object') {
      Object.assign(out, this.flattenFields(data.contact));
    }

    // Flat Velo / custom webhook
    for (const [key, value] of Object.entries(data)) {
      if (['_platform', 'context', 'submissions', 'data', 'contact'].includes(key)) continue;
      if (value !== null && value !== undefined && typeof value !== 'object') {
        out[this.toKey(key)] = String(value);
      }
    }

    return out;
  }

  flattenFields(obj) {
    /** @type {Record<string, string>} */
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'object') {
        out[this.toKey(key)] = JSON.stringify(value);
      } else {
        out[this.toKey(key)] = String(value);
      }
    }
    return out;
  }

  toKey(key) {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
}

export const wixIntegration = new WixIntegration();
