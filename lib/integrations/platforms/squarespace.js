import { PlatformIntegration } from './base';

export class SquarespaceIntegration extends PlatformIntegration {
  static id = 'squarespace';
  static label = 'Squarespace';
  static description = 'Squarespace form blocks via Code Injection connector';
  static version = '1.0.0';
  static setupSteps = [
    'Squarespace does not expose native form webhooks — use our Code Injection script.',
    'Settings → Advanced → Code Injection → Footer: paste integrations/squarespace/vibe-alerts.js.',
    'Replace YOUR_WEBHOOK_URL and YOUR_API_KEY in the script.',
    'Publish the site. Form submissions on Squarespace form blocks will forward to VibeAlerts.',
    'Alternatively, use Zapier/Make with header X-VibeAlerts-Platform: squarespace.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'squarespace') return true;
    if (d.objectType === 'form-submission') return true;
    if (d.formName && d.fields && typeof d.fields === 'object') return true;
    if (d.formId && d.submissionId && d.data) return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'squarespace' };

    if (data.formName) out.form_name = String(data.formName);
    if (data.formId) out.form_id = String(data.formId);
    if (data.submissionId) out.submission_id = String(data.submissionId);
    if (data.pageUrl) out.page_url = String(data.pageUrl);
    if (data.submissionTimestamp) out.submitted_at = String(data.submissionTimestamp);

    const fieldSources = [data.fields, data.data, data.submission];
    for (const source of fieldSources) {
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        Object.assign(out, this.flattenFields(source));
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (
        [
          '_platform',
          'objectType',
          'fields',
          'data',
          'submission',
          'formName',
          'formId',
          'submissionId',
          'pageUrl',
          'submissionTimestamp',
        ].includes(key)
      ) {
        continue;
      }
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

export const squarespaceIntegration = new SquarespaceIntegration();
