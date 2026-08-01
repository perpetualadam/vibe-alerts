import { NotificationProvider } from './base';
import { logger } from '@/lib/logger';
import { formatFieldLabel } from '@/lib/notifications/utils/text';

function formatSlackMessage(payload, sourceLabel = 'Website Form') {
  const fields = Object.entries(payload).map(([key, value]) => ({
    type: 'mrkdwn',
    text: `*${formatFieldLabel(key)}:*\n${String(value)}`,
  }));

  return {
    text: `New lead from ${sourceLabel}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🔔 New Lead — ${sourceLabel}`, emoji: true },
      },
      { type: 'section', fields: fields.slice(0, 10) },
      ...(fields.length > 10
        ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: `_+${fields.length - 10} more fields_` },
          }]
        : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: '_Received via VibeAlerts_' }],
      },
    ],
  };
}

function isValidSlackWebhook(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'hooks.slack.com' && parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export class SlackProvider extends NotificationProvider {
  static id = 'slack';
  static version = '1.0.0';
  static label = 'Slack';
  static description = 'Slack channel via Incoming Webhook';
  static configSchema = [
    {
      key: 'webhook_url',
      label: 'Incoming Webhook URL',
      type: 'url',
      placeholder: 'https://hooks.slack.com/services/...',
      required: true,
    },
  ];
  static setupGuide = [
    'In Slack: Apps → Incoming Webhooks → Add to channel.',
    'Copy the webhook URL and paste it below.',
  ];

  validateConfig(config) {
    const url = String(config.webhook_url ?? '').trim();
    if (!url) return { valid: false, error: 'Webhook URL is required' };
    if (!isValidSlackWebhook(url)) {
      return { valid: false, error: 'Invalid Slack webhook URL' };
    }
    return { valid: true, config: { webhook_url: url } };
  }

  formatMessage(payload) {
    return formatSlackMessage(payload);
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
      const data = { body: text };

      if (!res.ok) {
        return {
          success: false,
          error: text || `HTTP ${res.status}`,
          response: data,
          retryable: res.status >= 500 || res.status === 429,
        };
      }

      if (text !== 'ok') {
        return { success: false, error: text, response: data, retryable: false };
      }

      return { success: true, response: data };
    } catch (err) {
      logger.error('Slack send failed', { error: err.message });
      return { success: false, error: err.message, retryable: true };
    }
  }
}

export const slackPlugin = {
  id: SlackProvider.id,
  version: SlackProvider.version,
  label: SlackProvider.label,
  description: SlackProvider.description,
  configSchema: SlackProvider.configSchema,
  setupGuide: SlackProvider.setupGuide,
  provider: new SlackProvider(),
};
