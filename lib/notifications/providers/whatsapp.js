import { NotificationProvider } from './base';
import { getOptionalEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { payloadToPlainLines } from '@/lib/notifications/utils/text';

const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

export class WhatsAppProvider extends NotificationProvider {
  static id = 'whatsapp';
  static version = '1.0.0';
  static label = 'WhatsApp';
  static description = 'WhatsApp Business Cloud API messages';
  static configSchema = [
    {
      key: 'phone',
      label: 'Phone Number',
      type: 'tel',
      placeholder: '15551234567',
      required: true,
      help: 'E.164 format without + (e.g. 15551234567)',
    },
  ];
  static platformUnavailableMessage =
    'WhatsApp alerts are not enabled on VibeAlerts yet. Use Telegram, Slack, Discord, or Teams, or contact support to request WhatsApp.';
  static setupGuide = [
    'Enter the mobile number that should receive alerts (country code, no + sign, e.g. 447700900123).',
    'The recipient must have opted in to receive business messages from you.',
    'Save this channel, then send a test alert from the button above.',
  ];

  isPlatformReady() {
    const { whatsappAccessToken, whatsappPhoneNumberId } = getOptionalEnv();
    return Boolean(whatsappAccessToken && whatsappPhoneNumberId);
  }

  validateConfig(config) {
    const phone = String(config.phone ?? '').replace(/\D/g, '');
    if (!phone) return { valid: false, error: 'Phone number is required' };
    if (phone.length < 8) return { valid: false, error: 'Invalid phone number' };
    return { valid: true, config: { phone } };
  }

  formatMessage(payload) {
    return payloadToPlainLines(payload).join('\n').slice(0, 4096);
  }

  async send(context) {
    const validated = this.validateConfig(this.getConfig(context));
    if (!validated.valid) {
      return { success: false, error: validated.error, retryable: false };
    }

    const { whatsappAccessToken, whatsappPhoneNumberId } = getOptionalEnv();
    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      return {
        success: false,
        error: 'WhatsApp alerts are not available on this platform yet',
        retryable: false,
      };
    }

    const url = `${WHATSAPP_API}/${whatsappPhoneNumberId}/messages`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: validated.config.phone,
          type: 'text',
          text: { body: this.formatMessage(context.payload) },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${res.status}`,
          response: data,
          retryable: res.status >= 500 || res.status === 429,
        };
      }
      return { success: true, response: data };
    } catch (err) {
      logger.error('WhatsApp send failed', { error: err.message });
      return { success: false, error: err.message, retryable: true };
    }
  }
}

export const whatsappPlugin = {
  id: WhatsAppProvider.id,
  version: WhatsAppProvider.version,
  label: WhatsAppProvider.label,
  description: WhatsAppProvider.description,
  configSchema: WhatsAppProvider.configSchema,
  setupGuide: WhatsAppProvider.setupGuide,
  platformUnavailableMessage: WhatsAppProvider.platformUnavailableMessage,
  provider: new WhatsAppProvider(),
};
