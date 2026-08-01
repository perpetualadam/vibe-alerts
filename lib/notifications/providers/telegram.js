import { NotificationProvider } from './base';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  escapeMarkdownV2,
  formatFieldLabel,
  payloadToPlainLines,
} from '@/lib/notifications/utils/text';

const TELEGRAM_API = 'https://api.telegram.org';

function formatTelegramMessage(payload, sourceLabel = 'Website Form') {
  const lines = [`🔔 *New Lead — ${escapeMarkdownV2(sourceLabel)}*`, ''];
  for (const [key, value] of Object.entries(payload)) {
    lines.push(`*${escapeMarkdownV2(formatFieldLabel(key))}:* ${escapeMarkdownV2(String(value))}`);
  }
  lines.push('', '_Received via VibeAlerts_');
  return lines.join('\n');
}

export class TelegramProvider extends NotificationProvider {
  static id = 'telegram';
  static version = '1.0.0';
  static label = 'Telegram';
  static description = 'Instant mobile alerts via Telegram bot';
  static configSchema = [
    {
      key: 'chat_id',
      label: 'Chat ID',
      type: 'text',
      placeholder: '123456789 or -1001234567890',
      required: true,
      help: 'Message @userinfobot or @RawDataBot to get your ID. Group IDs start with a minus sign.',
    },
  ];
  static setupGuide = [
    'Open Telegram and search for @userinfobot or @RawDataBot, then hit Start.',
    'Copy the numerical ID given to you.',
    'For team groups: add @RawDataBot and your VibeAlerts bot to the group (ID starts with -).',
  ];

  validateConfig(config) {
    const chatId = String(config.chat_id ?? '').trim();
    if (!chatId) return { valid: false, error: 'Chat ID is required' };
    if (!/^-?\d+$/.test(chatId)) return { valid: false, error: 'Invalid Chat ID format' };
    return { valid: true, config: { chat_id: chatId } };
  }

  formatMessage(payload) {
    return formatTelegramMessage(payload);
  }

  async send(context) {
    const config = this.getConfig(context);
    const validated = this.validateConfig(config);
    if (!validated.valid) {
      return { success: false, error: validated.error, retryable: false };
    }

    const { telegramBotToken } = getEnv();
    const url = `${TELEGRAM_API}/bot${telegramBotToken}/sendMessage`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: validated.config.chat_id,
          text: this.formatMessage(context.payload),
          parse_mode: 'MarkdownV2',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const error = data.description || `HTTP ${res.status}`;
        // Retry as plain text if MarkdownV2 parsing failed
        if (
          res.status === 400 &&
          /parse|entity|markdown/i.test(error)
        ) {
          const plain = payloadToPlainLines(context.payload);
          const retry = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: validated.config.chat_id,
              text: plain,
            }),
          });
          const retryData = await retry.json();
          if (retry.ok && retryData.ok) {
            return { success: true, response: retryData };
          }
        }
        return {
          success: false,
          error,
          response: data,
          retryable: res.status >= 500 || res.status === 429,
        };
      }
      return { success: true, response: data };
    } catch (err) {
      logger.error('Telegram request failed', { error: err.message });
      return { success: false, error: err.message, retryable: true };
    }
  }
}

export const telegramPlugin = {
  id: TelegramProvider.id,
  version: TelegramProvider.version,
  label: TelegramProvider.label,
  description: TelegramProvider.description,
  configSchema: TelegramProvider.configSchema,
  setupGuide: TelegramProvider.setupGuide,
  provider: new TelegramProvider(),
};
