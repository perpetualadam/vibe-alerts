import { PlatformIntegration } from './base';

export class WebflowIntegration extends PlatformIntegration {
  static id = 'webflow';
  static label = 'Webflow';
  static description = 'Webflow native form webhooks';
  static version = '1.0.0';
  static setupSteps = [
    'In Webflow: Site Settings → Integrations / Forms → Webhooks (plan features vary).',
    'Create a webhook for Form submission events.',
    'URL = your VibeAlerts Webhook URL.',
    'Add headers X-VibeAlerts-Platform: webflow and X-VibeAlerts-Key: your API key.',
    'Publish the site, then use Send Test Notification in VibeAlerts (or submit a live form).',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'webflow') return true;
    if (d.triggerType === 'form_submission') return true;
    if (d.name && d.site && d.data) return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'webflow' };

    if (data.name) out.form_name = String(data.name);
    if (data.site) out.site = String(data.site);
    if (data._id) out.submission_id = String(data._id);
    if (data.triggerType) out.trigger_type = String(data.triggerType);

    const formData = data.data;
    if (formData && typeof formData === 'object' && !Array.isArray(formData)) {
      for (const [key, value] of Object.entries(formData)) {
        if (value === null || value === undefined) continue;
        out[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    return out;
  }
}

export const webflowIntegration = new WebflowIntegration();
