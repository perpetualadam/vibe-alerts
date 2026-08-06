/**
 * First-class WordPress form-plugin adapters.
 * Payloads still come from the VibeAlerts WP plugin bridges; each form tool
 * gets its own platform id, setup guide, and detected_platform value.
 */

import { PlatformIntegration } from './base';
import { wordpressIntegration } from './wordpress';

/**
 * @typedef {Object} WpFormAdapterOptions
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string[]} sourceTags - substrings matched against `_vibealerts_source`
 * @property {string[]} setupSteps
 * @property {(raw: Record<string, unknown>) => boolean} [detectExtra]
 */

/**
 * @param {WpFormAdapterOptions} options
 * @returns {PlatformIntegration}
 */
export function createWpFormAdapter(options) {
  const { id, label, description, sourceTags, setupSteps, detectExtra } = options;

  class WpFormAdapter extends PlatformIntegration {
    static id = id;
    static label = label;
    static description = description;
    static version = '1.0.0';
    static setupSteps = setupSteps;

    detectPayload(raw) {
      if (!raw || typeof raw !== 'object') return false;
      const data = /** @type {Record<string, unknown>} */ (raw);
      if (data._platform === id) return true;
      const source = String(data._vibealerts_source ?? '').toLowerCase();
      if (source && sourceTags.some((tag) => source.includes(tag))) return true;
      if (detectExtra?.(data)) return true;
      return false;
    }

    normalizePayload(raw) {
      const out = wordpressIntegration.normalizePayload(raw);
      out.source = id;
      return out;
    }
  }

  Object.defineProperty(WpFormAdapter, 'name', { value: `${id}Adapter` });
  return new WpFormAdapter();
}

export const contactForm7Integration = createWpFormAdapter({
  id: 'contact_form_7',
  label: 'Contact Form 7',
  description: 'WordPress Contact Form 7 — native VibeAlerts plugin bridge',
  sourceTags: ['contact-form-7', 'contact_form_7', 'cf7'],
  setupSteps: [
    'Install and activate Contact Form 7 on your WordPress site.',
    'Install the VibeAlerts WordPress plugin (Settings → VibeAlerts).',
    'Paste your Webhook URL and API Key, then save.',
    'Confirm Contact Form 7 appears under Detected form plugins.',
    'Use Send Test Notification in the VibeAlerts dashboard or Send Test Alert in WordPress.',
    'Submit a real CF7 form to verify live delivery.',
  ],
  detectExtra(data) {
    // Classic CF7 field names without another plugin source tag
    if (data._vibealerts_source) return false;
    return 'your-name' in data || 'your-email' in data || 'your-message' in data;
  },
});

export const wpformsIntegration = createWpFormAdapter({
  id: 'wpforms',
  label: 'WPForms',
  description: 'WordPress WPForms — native VibeAlerts plugin bridge',
  sourceTags: ['wpforms'],
  setupSteps: [
    'Install and activate WPForms (Lite or Pro).',
    'Install the VibeAlerts WordPress plugin and open Settings → VibeAlerts.',
    'Paste your Webhook URL and API Key.',
    'Confirm WPForms is listed under Detected form plugins.',
    'Send a test notification from the VibeAlerts dashboard, then submit a WPForms entry.',
  ],
  detectExtra(data) {
    if (data._vibealerts_source) return false;
    return Boolean(data.wpforms) || (data.form_id !== undefined && data.fields && !data.entry);
  },
});

export const gravityFormsIntegration = createWpFormAdapter({
  id: 'gravity_forms',
  label: 'Gravity Forms',
  description: 'WordPress Gravity Forms — native VibeAlerts plugin bridge',
  sourceTags: ['gravity-forms', 'gravity_forms', 'gravityforms'],
  setupSteps: [
    'Install and activate Gravity Forms.',
    'Install the VibeAlerts WordPress plugin (Settings → VibeAlerts).',
    'Paste your Webhook URL and API Key and save.',
    'Confirm Gravity Forms is detected — no per-form webhook wiring needed.',
    'Send a test notification from VibeAlerts, then submit a Gravity Form.',
  ],
  detectExtra(data) {
    return data.form_id !== undefined && data.entry && typeof data.entry === 'object';
  },
});

export const elementorFormsIntegration = createWpFormAdapter({
  id: 'elementor_forms',
  label: 'Elementor Forms',
  description: 'Elementor Pro Forms — native VibeAlerts plugin bridge',
  sourceTags: ['elementor', 'elementor-forms', 'elementor_forms'],
  setupSteps: [
    'Use Elementor Pro with Forms enabled on your WordPress site.',
    'Install the VibeAlerts WordPress plugin and paste Webhook URL + API Key.',
    'Confirm Elementor Forms appears under Detected form plugins.',
    'Send a test notification from the VibeAlerts dashboard.',
    'Publish an Elementor form and submit it to verify live alerts.',
  ],
});

export const fluentFormsIntegration = createWpFormAdapter({
  id: 'fluent_forms',
  label: 'Fluent Forms',
  description: 'WordPress Fluent Forms — native VibeAlerts plugin bridge',
  sourceTags: ['fluent', 'fluent-forms', 'fluent_forms'],
  setupSteps: [
    'Install and activate Fluent Forms.',
    'Install the VibeAlerts WordPress plugin (Settings → VibeAlerts).',
    'Paste your Webhook URL and API Key.',
    'Confirm Fluent Forms is listed under Detected form plugins.',
    'Send a test notification from VibeAlerts, then submit a Fluent Form.',
  ],
});
