import { PlatformIntegration } from './base';

export class HtmlIntegration extends PlatformIntegration {
  static id = 'html';
  static label = 'HTML / JavaScript';
  static description = 'Any custom website, landing page, or static HTML form';
  static version = '1.0.0';
  static setupSteps = [
    'Copy integrations/html/vibe-alerts.js to your site or paste the snippet below your form.',
    'Set data-vibealerts-form on your <form> element.',
    'Set WEBHOOK_URL and API_KEY in the script.',
  ];

  detectPayload(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const d = /** @type {Record<string, unknown>} */ (raw);
    return d._platform === 'html';
  }

  normalizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { source: 'html' };

    const data = /** @type {Record<string, unknown>} */ (raw);
    const out = { source: 'html' };

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      if (value === null || value === undefined) continue;
      out[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    return out;
  }
}

export const htmlIntegration = new HtmlIntegration();

/**
 * Client-side snippet generator for copy/paste.
 */
export function buildHtmlSnippet(webhookUrl, apiKey) {
  return `<!-- Add data-vibealerts-form to any form -->
<form id="lead-form" data-vibealerts-form>
  <input name="name" placeholder="Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Send</button>
</form>
<script src="/vibe-alerts.js"></script>
<script>
  VibeAlerts.init({
    webhookUrl: '${webhookUrl}',
    apiKey: '${apiKey}',
  });
</script>`;
}
