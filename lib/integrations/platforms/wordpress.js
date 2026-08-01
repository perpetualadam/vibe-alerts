import { PlatformIntegration } from './base';

/** Map common CF7 field names to readable labels */
const CF7_FIELD_MAP = {
  'your-name': 'name',
  'your-email': 'email',
  'your-subject': 'subject',
  'your-message': 'message',
  'your-phone': 'phone',
};

function flattenValue(value) {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function flattenObject(obj, prefix = '') {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}_${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value, flatKey));
    } else {
      const v = flattenValue(value);
      if (v !== undefined && v !== '') out[flatKey] = v;
    }
  }
  return out;
}

export class WordPressIntegration extends PlatformIntegration {
  static id = 'wordpress';
  static label = 'WordPress';
  static description = 'Contact Form 7, WPForms, Gravity Forms, and generic WordPress forms';
  static version = '1.0.0';
  static setupSteps = [
    'Install the VibeAlerts Connector plugin (integrations/wordpress/vibe-alerts-connector.php).',
    'Go to Settings → VibeAlerts in wp-admin.',
    'Paste your Webhook URL and API Key from the VibeAlerts dashboard.',
    'Enable the form plugins you use (Contact Form 7, WPForms, Gravity Forms).',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const data = /** @type {Record<string, unknown>} */ (raw);
    if (data._platform === 'wordpress') return true;
    if (data._vibealerts_source) return true;
    // CF7 typical fields
    if ('your-name' in data || 'your-email' in data) return true;
    // WPForms
    if (data.wpforms || data.form_id !== undefined && data.fields) return true;
    // Gravity Forms
    if (data.form_id !== undefined && data.entry && typeof data.entry === 'object') return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    const data = /** @type {Record<string, unknown>} */ (raw);

    // Gravity Forms webhook shape
    if (data.entry && typeof data.entry === 'object') {
      const entry = /** @type {Record<string, unknown>} */ (data.entry);
      const out = flattenObject(entry);
      if (data.form_id) out.form_id = String(data.form_id);
      out.source = 'gravity_forms';
      return out;
    }

    // WPForms shape
    if (data.fields && typeof data.fields === 'object') {
      const fields = /** @type {Record<string, unknown>} */ (data.fields);
      const out = flattenObject(fields);
      if (data.form_id) out.form_id = String(data.form_id);
      out.source = 'wpforms';
      return out;
    }

    // Contact Form 7 and generic flat WordPress POST
    const out = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_') && key !== '_platform') continue;
      const mappedKey = CF7_FIELD_MAP[key] ?? key.replace(/^your-/, '');
      const v = flattenValue(value);
      if (v !== undefined && v !== '') out[mappedKey] = v;
    }
    if (!out.source) out.source = 'wordpress';
    return out;
  }
}

export const wordpressIntegration = new WordPressIntegration();
