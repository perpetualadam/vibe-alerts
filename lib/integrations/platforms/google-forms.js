import { PlatformIntegration } from './base';

export class GoogleFormsIntegration extends PlatformIntegration {
  static id = 'google_forms';
  static label = 'Google Forms';
  static description = 'Google Forms via Apps Script onFormSubmit trigger';
  static version = '1.0.0';
  static setupSteps = [
    'Open your Google Form → ⋮ → Script editor (Extensions → Apps Script).',
    'Paste integrations/google-forms/vibe-alerts.gs and replace YOUR_WEBHOOK_URL + YOUR_API_KEY.',
    'Run setupTrigger() once to authorize and install the onFormSubmit trigger.',
    'New form responses will POST to VibeAlerts automatically.',
    'Headers sent: X-VibeAlerts-Platform: google_forms and X-VibeAlerts-Key.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'google_forms') return true;
    if (d.formId && (d.answers || d.response || d.namedValues)) return true;
    if (d.formTitle && d.responseId) return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'google_forms' };

    if (data.formId) out.form_id = String(data.formId);
    if (data.formTitle) out.form_title = String(data.formTitle);
    if (data.responseId) out.response_id = String(data.responseId);
    if (data.responseTimestamp) out.submitted_at = String(data.responseTimestamp);
    if (data.respondentEmail) out.email = String(data.respondentEmail);

    const answerSources = [data.answers, data.namedValues, data.response];
    for (const source of answerSources) {
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        Object.assign(out, this.flattenFields(source));
      }
    }

    if (Array.isArray(data.itemResponses)) {
      for (const item of data.itemResponses) {
        if (!item || typeof item !== 'object') continue;
        const row = /** @type {Record<string, unknown>} */ (item);
        const title = row.title ? String(row.title) : row.question;
        const key = title ? this.toKey(String(title)) : '';
        const value = row.answer ?? row.response ?? row.value;
        if (key && value !== null && value !== undefined) {
          out[key] = String(value);
        }
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (
        [
          '_platform',
          'formId',
          'formTitle',
          'responseId',
          'responseTimestamp',
          'respondentEmail',
          'answers',
          'namedValues',
          'response',
          'itemResponses',
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
      if (Array.isArray(value)) {
        out[this.toKey(key)] = value.map(String).join(', ');
      } else if (typeof value === 'object') {
        out[this.toKey(key)] = JSON.stringify(value);
      } else {
        out[this.toKey(key)] = String(value);
      }
    }
    return out;
  }

  toKey(key) {
    return key
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }
}

export const googleFormsIntegration = new GoogleFormsIntegration();
