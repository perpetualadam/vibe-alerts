import { NotificationProvider } from './base';
import { logger } from '@/lib/logger';
import { formatFieldLabel } from '@/lib/notifications/utils/text';

function formatTeamsMessage(payload, sourceLabel = 'Website Form') {
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '6366F1',
    summary: `New Lead — ${sourceLabel}`,
    sections: [
      {
        activityTitle: `🔔 New Lead — ${sourceLabel}`,
        facts: Object.entries(payload).map(([key, value]) => ({
          name: formatFieldLabel(key),
          value: String(value),
        })).slice(0, 20),
        markdown: true,
      },
    ],
  };
}

function isValidTeamsWebhook(url) {
  try {
    const parsed = new URL(url);
    const validHosts = [
      'outlook.office.com',
      'outlook.office365.com',
      'office.com',
      'webhook.office.com',
    ];
    return (
      parsed.protocol === 'https:' &&
      validHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))
    );
  } catch {
    return false;
  }
}

export class TeamsProvider extends NotificationProvider {
  static id = 'teams';
  static version = '1.0.0';
  static label = 'Microsoft Teams';
  static description = 'Teams channel via Incoming Webhook';
  static configSchema = [
    {
      key: 'webhook_url',
      label: 'Incoming Webhook URL',
      type: 'url',
      placeholder: 'https://outlook.office.com/webhook/...',
      required: true,
    },
  ];
  static setupGuide = [
    'In Teams: open channel → Connectors → Incoming Webhook.',
    'Create a webhook and copy the URL below.',
  ];

  validateConfig(config) {
    const url = String(config.webhook_url ?? '').trim();
    if (!url) return { valid: false, error: 'Webhook URL is required' };
    if (!isValidTeamsWebhook(url)) {
      return { valid: false, error: 'Invalid Microsoft Teams webhook URL' };
    }
    return { valid: true, config: { webhook_url: url } };
  }

  formatMessage(payload) {
    return formatTeamsMessage(payload);
  }

  async send(context) {
    const validated = this.validateConfig(this.getConfig(context));
    if (!validated.valid) {
      return { success: false, error: validated.error, retryable: false };
    }

    try {
      const res = await fetch(validated.config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formatMessage(context.payload)),
      });

      const text = await res.text();
      let data = { body: text };
      try {
        data = JSON.parse(text);
      } catch {
        // plain text response
      }

      if (!res.ok) {
        return {
          success: false,
          error: text || `HTTP ${res.status}`,
          response: data,
          retryable: res.status >= 500 || res.status === 429,
        };
      }

      return { success: true, response: data };
    } catch (err) {
      logger.error('Teams send failed', { error: err.message });
      return { success: false, error: err.message, retryable: true };
    }
  }
}

export const teamsPlugin = {
  id: TeamsProvider.id,
  version: TeamsProvider.version,
  label: TeamsProvider.label,
  description: TeamsProvider.description,
  configSchema: TeamsProvider.configSchema,
  setupGuide: TeamsProvider.setupGuide,
  provider: new TeamsProvider(),
};
