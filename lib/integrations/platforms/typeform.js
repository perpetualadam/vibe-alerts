import { PlatformIntegration } from './base';

export class TypeformIntegration extends PlatformIntegration {
  static id = 'typeform';
  static label = 'Typeform';
  static description = 'Typeform native webhook for form_response events';
  static version = '1.0.0';
  static setupSteps = [
    'In Typeform: open your form → Connect → Webhooks.',
    'Add webhook URL: your VibeAlerts webhook URL.',
    'Enable the webhook for form submissions.',
    'Add secret header X-VibeAlerts-Key: your API key from dashboard.',
    'Add header X-VibeAlerts-Platform: typeform (via Typeform webhook secret headers if available, or use Zapier/Make as proxy).',
    'Typeform sends form_response payloads automatically — no extra code required.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    if (d._platform === 'typeform') return true;
    if (d.event_type === 'form_response' && d.form_response) return true;
    return false;
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'typeform' };

    if (data.event_id) out.event_id = String(data.event_id);
    if (data.event_type) out.event_type = String(data.event_type);

    const formResponse = data.form_response;
    if (formResponse && typeof formResponse === 'object' && !Array.isArray(formResponse)) {
      const fr = /** @type {Record<string, unknown>} */ (formResponse);
      if (fr.form_id) out.form_id = String(fr.form_id);
      if (fr.token) out.response_token = String(fr.token);
      if (fr.submitted_at) out.submitted_at = String(fr.submitted_at);
      if (fr.landed_at) out.landed_at = String(fr.landed_at);

      if (Array.isArray(fr.answers)) {
        for (const answer of fr.answers) {
          if (!answer || typeof answer !== 'object') continue;
          const a = /** @type {Record<string, unknown>} */ (answer);
          const field = a.field && typeof a.field === 'object'
            ? /** @type {Record<string, unknown>} */ (a.field)
            : {};
          const key = this.fieldKey(field);
          const value = this.extractAnswerValue(a);
          if (key && value !== undefined) {
            out[key] = value;
          }
        }
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (['_platform', 'event_id', 'event_type', 'form_response'].includes(key)) continue;
      if (value !== null && value !== undefined && typeof value !== 'object') {
        out[this.toKey(key)] = String(value);
      }
    }

    return out;
  }

  /** @param {Record<string, unknown>} field */
  fieldKey(field) {
    if (field.ref) return this.toKey(String(field.ref));
    if (field.title) return this.toKey(String(field.title));
    if (field.id) return `field_${String(field.id).slice(0, 8)}`;
    return '';
  }

  /** @param {Record<string, unknown>} answer */
  extractAnswerValue(answer) {
    const type = answer.type;

    if (type === 'text' && answer.text !== undefined) return String(answer.text);
    if (type === 'email' && answer.email !== undefined) return String(answer.email);
    if (type === 'url' && answer.url !== undefined) return String(answer.url);
    if (type === 'file_url' && answer.file_url !== undefined) return String(answer.file_url);
    if (type === 'phone_number' && answer.phone_number !== undefined) {
      return String(answer.phone_number);
    }
    if (type === 'number' && answer.number !== undefined) return String(answer.number);
    if (type === 'boolean' && answer.boolean !== undefined) return String(answer.boolean);
    if (type === 'date' && answer.date !== undefined) return String(answer.date);

    if (type === 'choice' && answer.choice && typeof answer.choice === 'object') {
      const choice = /** @type {Record<string, unknown>} */ (answer.choice);
      if (choice.label) return String(choice.label);
    }

    if (type === 'choices' && answer.choices && typeof answer.choices === 'object') {
      const choices = /** @type {Record<string, unknown>} */ (answer.choices);
      if (Array.isArray(choices.labels)) {
        return choices.labels.map(String).join(', ');
      }
    }

    if (answer.text !== undefined) return String(answer.text);
    return undefined;
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

export const typeformIntegration = new TypeformIntegration();
