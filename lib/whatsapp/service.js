/**
 * Reusable WhatsApp Business Platform service (Meta Cloud API).
 * Multi-tenant: each customer connects their own WABA credentials.
 */

import { getOptionalEnv } from '@/lib/env';
import { isCredentialEncryptionReady } from '@/lib/security/credentials';
import { logger } from '@/lib/logger';
import {
  sendWhatsAppTextMessage,
  verifyWhatsAppCredentials,
} from '@/lib/whatsapp/client';
import {
  disconnectWhatsAppConnection,
  getWhatsAppConnectionPublic,
  getWhatsAppCredentials,
  markWhatsAppMessageSuccess,
  upsertWhatsAppConnection,
} from '@/lib/whatsapp/db';

/**
 * @typedef {Object} ResolvedWhatsAppCredentials
 * @property {string} accessToken
 * @property {string} phoneNumberId
 * @property {'tenant'|'platform'} source
 */

/**
 * Whether this deployment can accept WhatsApp Business connections.
 */
export function isWhatsAppPlatformReady() {
  if (isCredentialEncryptionReady()) return true;
  const { whatsappAccessToken, whatsappPhoneNumberId } = getOptionalEnv();
  return Boolean(whatsappAccessToken && whatsappPhoneNumberId);
}

/**
 * Normalize Meta IDs / tokens from form input.
 * @param {Record<string, unknown>} input
 */
export function normalizeWhatsAppConnectInput(input) {
  const wabaId = String(input.wabaId ?? input.waba_id ?? '').trim();
  const phoneNumberId = String(
    input.phoneNumberId ?? input.phone_number_id ?? ''
  ).trim();
  const accessToken = String(
    input.accessToken ?? input.access_token ?? ''
  ).trim();
  const recipientPhone = String(input.phone ?? input.recipientPhone ?? '')
    .replace(/\D/g, '');

  const errors = [];
  if (!wabaId) errors.push('WhatsApp Business Account ID is required');
  if (!phoneNumberId) errors.push('Phone Number ID is required');
  if (!accessToken) errors.push('Access Token is required');
  if (!/^\d+$/.test(wabaId)) errors.push('WhatsApp Business Account ID must be numeric');
  if (!/^\d+$/.test(phoneNumberId)) errors.push('Phone Number ID must be numeric');
  if (accessToken.length < 20) errors.push('Access Token looks invalid');

  return {
    valid: errors.length === 0,
    error: errors[0],
    wabaId,
    phoneNumberId,
    accessToken,
    recipientPhone: recipientPhone || null,
  };
}

/**
 * Resolve credentials for a tenant: prefer their connection, else platform env.
 * @param {string} userId
 * @returns {Promise<ResolvedWhatsAppCredentials|null>}
 */
export async function resolveWhatsAppCredentials(userId) {
  try {
    const tenant = await getWhatsAppCredentials(userId);
    if (tenant?.accessToken && tenant.phoneNumberId) {
      return {
        accessToken: tenant.accessToken,
        phoneNumberId: tenant.phoneNumberId,
        source: 'tenant',
      };
    }
  } catch (err) {
    logger.error('Failed to load tenant WhatsApp credentials', {
      userId,
      error: err.message,
    });
  }

  const { whatsappAccessToken, whatsappPhoneNumberId } = getOptionalEnv();
  if (whatsappAccessToken && whatsappPhoneNumberId) {
    return {
      accessToken: whatsappAccessToken,
      phoneNumberId: whatsappPhoneNumberId,
      source: 'platform',
    };
  }

  return null;
}

/**
 * Connect a customer's WhatsApp Business account after Meta API verification.
 * @param {Object} params
 * @param {string} params.userId
 * @param {Record<string, unknown>} params.input
 */
export async function connectWhatsAppAccount({ userId, input }) {
  if (!isCredentialEncryptionReady()) {
    return {
      ok: false,
      status: 503,
      error:
        'WhatsApp connections are not available: CREDENTIALS_ENCRYPTION_KEY is not configured.',
    };
  }

  const normalized = normalizeWhatsAppConnectInput(input);
  if (!normalized.valid) {
    return { ok: false, status: 400, error: normalized.error };
  }

  const verified = await verifyWhatsAppCredentials({
    accessToken: normalized.accessToken,
    phoneNumberId: normalized.phoneNumberId,
    wabaId: normalized.wabaId,
  });

  if (!verified.valid) {
    return {
      ok: false,
      status: 400,
      error: verified.error || 'Could not verify WhatsApp credentials with Meta',
    };
  }

  try {
    const connection = await upsertWhatsAppConnection({
      userId,
      wabaId: normalized.wabaId,
      phoneNumberId: normalized.phoneNumberId,
      accessToken: normalized.accessToken,
      displayPhoneNumber: verified.displayPhoneNumber,
      verifiedName: verified.verifiedName,
    });

    return {
      ok: true,
      status: 200,
      connection,
      recipientPhone: normalized.recipientPhone,
    };
  } catch (err) {
    logger.error('Failed to persist WhatsApp connection', {
      userId,
      error: err.message,
    });
    return { ok: false, status: 500, error: 'Failed to save WhatsApp connection' };
  }
}

/**
 * Disconnect a customer's WhatsApp Business account.
 * @param {string} userId
 */
export async function disconnectWhatsAppAccount(userId) {
  if (!isCredentialEncryptionReady()) {
    // Still allow clearing public state if a row exists without re-encrypting? Need key to overwrite.
    return {
      ok: false,
      status: 503,
      error:
        'Cannot disconnect securely: CREDENTIALS_ENCRYPTION_KEY is not configured.',
    };
  }

  try {
    const connection = await disconnectWhatsAppConnection(userId);
    return { ok: true, status: 200, connection };
  } catch (err) {
    logger.error('Failed to disconnect WhatsApp', { userId, error: err.message });
    return { ok: false, status: 500, error: 'Failed to disconnect WhatsApp' };
  }
}

/**
 * Send a test text message using the tenant's connected account.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.to
 * @param {string} [params.message]
 */
export async function sendWhatsAppTestMessage({
  userId,
  to,
  message = 'VibeAlerts WhatsApp test message — connection successful.',
}) {
  const phone = String(to ?? '').replace(/\D/g, '');
  if (!phone || phone.length < 8) {
    return { ok: false, status: 400, error: 'A valid recipient phone number is required' };
  }

  const credentials = await resolveWhatsAppCredentials(userId);
  if (!credentials) {
    return {
      ok: false,
      status: 400,
      error: 'WhatsApp is not connected. Connect your WhatsApp Business account first.',
    };
  }

  const result = await sendWhatsAppTextMessage({
    accessToken: credentials.accessToken,
    phoneNumberId: credentials.phoneNumberId,
    to: phone,
    body: message,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status >= 400 && result.status < 500 ? 400 : 502,
      error: result.error || 'WhatsApp API rejected the test message',
      retryable: result.retryable,
    };
  }

  if (credentials.source === 'tenant') {
    try {
      await markWhatsAppMessageSuccess(userId);
    } catch (err) {
      logger.warn('WhatsApp test sent but failed to update last_successful_message_at', {
        userId,
        error: err.message,
      });
    }
  }

  const connection = await getWhatsAppConnectionPublic(userId);
  return {
    ok: true,
    status: 200,
    messageId: result.data?.messages?.[0]?.id ?? null,
    connection,
    source: credentials.source,
  };
}

/**
 * Public connection status for dashboard (never includes access token).
 * @param {string} userId
 */
export async function getWhatsAppStatus(userId) {
  const connection = await getWhatsAppConnectionPublic(userId);
  return {
    platformReady: isWhatsAppPlatformReady(),
    encryptionReady: isCredentialEncryptionReady(),
    connection,
  };
}

/**
 * Shared send helper used by the notification plugin.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.to
 * @param {string} params.body
 */
export async function sendWhatsAppAlert({ userId, to, body }) {
  const credentials = await resolveWhatsAppCredentials(userId);
  if (!credentials) {
    return {
      success: false,
      error: 'WhatsApp Business account is not connected',
      retryable: false,
    };
  }

  const result = await sendWhatsAppTextMessage({
    accessToken: credentials.accessToken,
    phoneNumberId: credentials.phoneNumberId,
    to,
    body,
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.error || 'WhatsApp send failed',
      response: result.data,
      retryable: Boolean(result.retryable),
    };
  }

  if (credentials.source === 'tenant') {
    try {
      await markWhatsAppMessageSuccess(userId);
    } catch (err) {
      logger.warn('WhatsApp alert sent but failed to update last_successful_message_at', {
        userId,
        error: err.message,
      });
    }
  }

  return { success: true, response: result.data };
}

/** Singleton-style service facade for imports that prefer a class/object API. */
export const WhatsAppProviderService = {
  isPlatformReady: isWhatsAppPlatformReady,
  getStatus: getWhatsAppStatus,
  connect: connectWhatsAppAccount,
  disconnect: disconnectWhatsAppAccount,
  sendTestMessage: sendWhatsAppTestMessage,
  sendAlert: sendWhatsAppAlert,
  resolveCredentials: resolveWhatsAppCredentials,
};

export default WhatsAppProviderService;
