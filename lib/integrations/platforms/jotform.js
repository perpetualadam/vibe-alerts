import { PlatformIntegration } from './base';

/**
 * Jotform webhook / Zapier-style submission adapter.
 * Native Jotform webhooks often send `rawRequest` as a JSON string plus metadata.
 */
export class JotformIntegration extends PlatformIntegration {
  static id = 'jotform';
  static label = 'Jotform';
  static description = 'Jotform form webhooks and Zapier/Make integrations';
  static version = '1.0.0';
  static setupSteps = [
    'In Jotform: open your form → Settings → Integrations → WebHooks.',
    'Add webhook URL: your VibeAlerts Webhook URL.',
    'If your plan supports custom headers, add X-VibeAlerts-Platform: jotform and X-VibeAlerts-Key: your API key.',
    'Otherwise use Zapier/Make: Jotform “New Submission” → Webhooks by Zapier POST to VibeAlerts with those headers.',
    'Send a test submission (or use Send Test Notification in the VibeAlerts dashboard).',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'jotform') return true;
    if (d.rawRequest !== undefined && (d.formID || d.form_id || d.formTitle || d.form_title)) {
      return true;
    }
    if (d.submissionID !== undefined && d.formID !== undefined) return true;
    if (typeof d.pretty === 'string' && (d.username || d.formTitle)) return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'jotform' };

    if (data.formID || data.form_id) out.form_id = String(data.formID || data.form_id);
    if (data.formTitle || data.form_title) {
      out.form_title = String(data.formTitle || data.form_title);
    }
    if (data.submissionID || data.submission_id) {
      out.submission_id = String(data.submissionID || data.submission_id);
    }
    if (data.username) out.username = String(data.username);

    // Native webhook: answers packed in rawRequest JSON string
    const fromRaw = this.parseRawRequest(data.rawRequest);
    Object.assign(out, fromRaw);

    // Zapier / custom flat fields
    for (const [key, value] of Object.entries(data)) {
      if (
        [
          '_platform',
          'rawRequest',
          'pretty',
          'formID',
          'form_id',
          'formTitle',
          'form_title',
          'submissionID',
          'submission_id',
          'username',
        ].includes(key)
      ) {
        continue;
      }
      if (value !== null && value !== undefined && typeof value !== 'object') {
        out[this.toKey(key)] = String(value);
      }
    }

    // Human-readable pretty dump as fallback message
    if (!out.message && typeof data.pretty === 'string' && data.pretty.trim()) {
      out.message = data.pretty.trim().slice(0, 2000);
    }

    return out;
  }

  /**
   * @param {unknown} rawRequest
   * @returns {Record<string, string>}
   */
  parseRawRequest(rawRequest) {
    /** @type {Record<string, string>} */
    const out = {};
    if (rawRequest == null) return out;

    let parsed = rawRequest;
    if (typeof rawRequest === 'string') {
      try {
        parsed = JSON.parse(rawRequest);
      } catch {
        out.message = rawRequest.slice(0, 2000);
        return out;
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;

    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith('q') && key.includes('_')) {
        // Jotform keys like q3_name / q5_email
        const label = key.replace(/^q\d+_/, '');
        const v = this.stringifyValue(value);
        if (v !== undefined) out[this.toKey(label)] = v;
        continue;
      }
      if (key.startsWith('_')) continue;
      const v = this.stringifyValue(value);
      if (v !== undefined) out[this.toKey(key)] = v;
    }

    return out;
  }

  /** @param {unknown} value */
  stringifyValue(value) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.map(String).join(', ');
      // nested name objects { first, last }
      const obj = /** @type {Record<string, unknown>} */ (value);
      if (obj.first || obj.last) {
        return [obj.first, obj.last].filter(Boolean).map(String).join(' ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  toKey(key) {
    return String(key)
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }
}

export const jotformIntegration = new JotformIntegration();
