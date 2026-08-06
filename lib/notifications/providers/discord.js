import { NotificationProvider } from './base';
import { logger } from '@/lib/logger';
import { formatFieldLabel } from '@/lib/notifications/utils/text';
import { formatCallablePhoneValue } from '@/lib/notifications/utils/phone';

function formatDiscordFieldValue(key, value) {
  const callable = formatCallablePhoneValue(
    key,
    value,
    (display, href) => `[${display}](${href})`
  );
  if (callable) return callable;
  return String(value);
}

function formatDiscordMessage(payload, sourceLabel = 'Website Form') {
  const fields = Object.entries(payload).map(([key, value]) => ({
    name: formatFieldLabel(key).slice(0, 256),
    value: formatDiscordFieldValue(key, value).slice(0, 1024) || '—',
    inline: true,
  }));

  return {
    content: `New lead from ${sourceLabel}`,
    embeds: [
      {
        title: `🔔 New Lead — ${sourceLabel}`.slice(0, 256),
        color: 0x6366f1,
        fields: fields.slice(0, 25),
        footer: { text: 'Received via VibeAlerts' },
      },
    ],
  };
}

function isValidDiscordWebhook(url) {
  try {
    const parsed = new URL(url);
    const hostOk =
      parsed.hostname === 'discord.com' ||
      parsed.hostname === 'discordapp.com' ||
      parsed.hostname.endsWith('.discord.com') ||
      parsed.hostname.endsWith('.discordapp.com');
    return (
      parsed.protocol === 'https:' &&
      hostOk &&
      parsed.pathname.includes('/api/webhooks/')
    );
  } catch {
    return false;
  }
}

export class DiscordProvider extends NotificationProvider {
  static id = 'discord';
  static version = '1.0.0';
  static label = 'Discord';
  static description = 'Discord channel alerts via Incoming Webhook';
  static configSchema = [
    {
      key: 'webhook_url',
      label: 'Incoming Webhook URL',
      type: 'url',
      placeholder: 'https://discord.com/api/webhooks/...',
      required: true,
      help: 'Create a webhook in Discord channel settings → Integrations → Webhooks.',
    },
  ];
  static setupGuide = [
    'In Discord: open the channel → Edit Channel → Integrations → Webhooks → New Webhook.',
    'Copy the webhook URL, paste it below, then click Save Discord.',
    'Send a test alert from the dashboard to confirm delivery.',
  ];

  validateConfig(config) {
    const url = String(config.webhook_url ?? '').trim();
    if (!url) return { valid: false, error: 'Webhook URL is required' };
    if (!isValidDiscordWebhook(url)) {
      return { valid: false, error: 'Invalid Discord webhook URL' };
    }
    return { valid: true, config: { webhook_url: url } };
  }

  formatMessage(payload) {
    return formatDiscordMessage(payload);
  }

  async healthCheck(context) {
    // Discord uses per-tenant webhook URLs — platform is always ready.
    return super.healthCheck(context);
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
        if (text) data = JSON.parse(text);
      } catch {
        // Discord often returns empty body on success
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
      logger.error('Discord send failed', { error: err.message });
      return { success: false, error: err.message, retryable: true };
    }
  }
}

export const discordPlugin = {
  id: DiscordProvider.id,
  version: DiscordProvider.version,
  label: DiscordProvider.label,
  description: DiscordProvider.description,
  configSchema: DiscordProvider.configSchema,
  setupGuide: DiscordProvider.setupGuide,
  provider: new DiscordProvider(),
};
