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
  static description =
    'Contact Form 7, WPForms, Gravity Forms, Fluent Forms, Elementor Forms — native plugin';
  static version = '2.0.0';
  static setupSteps = [
    'Download the VibeAlerts WordPress plugin (integrations/wordpress/vibealerts or npm run package:wordpress).',
    'In WordPress admin: Plugins → Add New → Upload Plugin → activate VibeAlerts.',
    'Open Settings → VibeAlerts and paste your Webhook URL + API Key from the VibeAlerts dashboard.',
    'Confirm auto-detected form plugins (CF7, WPForms, Gravity, Fluent, Elementor), then Send Test Alert.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const data = /** @type {Record<string, unknown>} */ (raw);
    if (data._platform === 'wordpress') return true;
    if (data._vibealerts_source) return true;
    // CF7 typical fields
    if ('your-name' in data || 'your-email' in data) return true;
    // WPForms / Fluent / Elementor field bags
    if (data.wpforms || (data.form_id !== undefined && data.fields)) return true;
    // Gravity Forms
    if (data.form_id !== undefined && data.entry && typeof data.entry === 'object') return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    const data = /** @type {Record<string, unknown>} */ (raw);
    const pluginSource = String(data._vibealerts_source ?? '');

    // Gravity Forms webhook shape
    if (data.entry && typeof data.entry === 'object') {
      const entry = /** @type {Record<string, unknown>} */ (data.entry);
      const out = flattenObject(entry);
      if (data.form_id) out.form_id = String(data.form_id);
      if (data.form_title) out.form_title = String(data.form_title);
      out.source = 'gravity_forms';
      return out;
    }

    // WPForms / Fluent Forms / Elementor field bag
    if (data.fields && typeof data.fields === 'object') {
      const fields = /** @type {Record<string, unknown>} */ (data.fields);
      const out = flattenObject(fields);
      if (data.form_id) out.form_id = String(data.form_id);
      if (data.form_title) out.form_title = String(data.form_title);
      if (pluginSource.includes('fluent')) out.source = 'fluent_forms';
      else if (pluginSource.includes('elementor')) out.source = 'elementor_forms';
      else if (pluginSource.includes('wpforms')) out.source = 'wpforms';
      else out.source = 'wpforms';
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
    if (pluginSource.includes('contact-form-7')) out.source = 'contact_form_7';
    else if (!out.source) out.source = 'wordpress';
    return out;
  }
}

export const wordpressIntegration = new WordPressIntegration();
