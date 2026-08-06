import { NotificationProvider } from './base';
import { isCredentialEncryptionReady } from '@/lib/security/credentials';
import { getOptionalEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { payloadToPlainLines } from '@/lib/notifications/utils/text';
import {
  isWhatsAppPlatformReady,
  sendWhatsAppAlert,
  sendWhatsAppTestMessage,
} from '@/lib/whatsapp/service';
import { DEFAULT_TEST_PAYLOAD } from '@/lib/notifications/providers/base';

export class WhatsAppProvider extends NotificationProvider {
  static id = 'whatsapp';
  static version = '2.0.0';
  static label = 'WhatsApp';
  static description = 'WhatsApp Business Cloud API (your own Meta account)';
  static configSchema = [
    {
      key: 'phone',
      label: 'Alert Recipient Phone',
      type: 'tel',
      placeholder: '15551234567',
      required: true,
      help: 'E.164 format without + (e.g. 15551234567). Must have opted in to receive business messages.',
    },
  ];
  static platformUnavailableMessage =
    'WhatsApp Business requires CREDENTIALS_ENCRYPTION_KEY on the server so each customer can connect their own Meta account securely. Contact support if you need this enabled.';
  static setupGuide = [
    'Connect your WhatsApp Business account in the WhatsApp Business panel (WABA ID, Phone Number ID, Access Token).',
    'Enter the mobile number that should receive alerts (country code, no + sign).',
    'Enable this channel and save, then use Send Test Message in the WhatsApp panel.',
  ];

  isPlatformReady() {
    return isWhatsAppPlatformReady();
  }

  validateConfig(config) {
    const phone = String(config.phone ?? '').replace(/\D/g, '');
    if (!phone) return { valid: false, error: 'Phone number is required' };
    if (phone.length < 8) return { valid: false, error: 'Invalid phone number' };
    return { valid: true, config: { phone } };
  }

  /**
   * Tenant must have a connected WABA (or legacy platform env) plus a recipient phone.
   * @param {import('./base').NotificationContext} context
   */
  isConfigured(context) {
    if (!this.isEnabled(context)) return false;
    if (!this.validateConfig(this.getConfig(context)).valid) return false;

    const entry = this.getChannelEntry(context);
    if (entry?.config?.whatsapp_connected === true || entry?.config?.whatsapp_connected === 'true') {
      return true;
    }

    // Legacy platform-operator credentials still allow delivery without per-tenant connect.
    const { whatsappAccessToken, whatsappPhoneNumberId } = getOptionalEnv();
    if (whatsappAccessToken && whatsappPhoneNumberId) return true;

    // Encryption ready + connected_at hint from channel row (set on connect).
    if (isCredentialEncryptionReady() && entry?.connected_at) return true;

    return false;
  }

  formatMessage(payload) {
    return payloadToPlainLines(payload).join('\n').slice(0, 4096);
  }

  async healthCheck(context) {
    if (!this.isPlatformReady()) {
      return {
        healthy: false,
        provider: this.id,
        message:
          'WhatsApp Business is unavailable (set CREDENTIALS_ENCRYPTION_KEY or legacy platform tokens)',
      };
    }

    if (!context) {
      return {
        healthy: true,
        provider: this.id,
        message: 'WhatsApp platform is ready for per-tenant connections',
        details: { platformReady: true },
      };
    }

    return super.healthCheck(context);
  }

  /**
   * Provider Test() — sends a Cloud API test message to the configured recipient.
   * @param {import('./base').NotificationContext} context
   */
  async test(context) {
    const validated = this.validateConfig(this.getConfig(context));
    if (!validated.valid) {
      return { success: false, error: validated.error, retryable: false };
    }
    if (!context.userId) {
      return { success: false, error: 'Missing tenant user id', retryable: false };
    }

    const payload =
      context.payload && Object.keys(context.payload).length > 0
        ? context.payload
        : DEFAULT_TEST_PAYLOAD;
    const body = this.formatMessage(payload);

    try {
      const result = await sendWhatsAppTestMessage({
        userId: context.userId,
        to: validated.config.phone,
        message: body,
      });
      if (!result.ok) {
        return {
          success: false,
          error: result.error,
          retryable: Boolean(result.retryable),
        };
      }
      return {
        success: true,
        response: { messageId: result.messageId, source: result.source },
      };
    } catch (err) {
      logger.error('WhatsApp test failed', { error: err.message, userId: context.userId });
      return { success: false, error: err.message, retryable: true };
    }
  }

  async send(context) {
    const validated = this.validateConfig(this.getConfig(context));
    if (!validated.valid) {
      return { success: false, error: validated.error, retryable: false };
    }

    if (!context.userId) {
      return { success: false, error: 'Missing tenant user id', retryable: false };
    }

    try {
      return await sendWhatsAppAlert({
        userId: context.userId,
        to: validated.config.phone,
        body: this.formatMessage(context.payload),
      });
    } catch (err) {
      logger.error('WhatsApp send failed', { error: err.message, userId: context.userId });
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
