/**
 * Official Meta WhatsApp Cloud API HTTP client.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { logger } from '@/lib/logger';

const DEFAULT_GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = 'https://graph.facebook.com';

/**
 * @returns {string}
 */
export function getWhatsAppGraphVersion() {
  return (process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION).replace(/^\//, '');
}

/**
 * @param {string} path - Absolute path after version, e.g. `/{phoneNumberId}/messages`
 */
function graphUrl(path) {
  const version = getWhatsAppGraphVersion();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${GRAPH_BASE}/${version}${normalized}`;
}

/**
 * @typedef {Object} WhatsAppApiResult
 * @property {boolean} ok
 * @property {number} status
 * @property {Record<string, unknown>} data
 * @property {string} [error]
 * @property {boolean} [retryable]
 */

/**
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} params.path
 * @param {string} [params.method]
 * @param {Record<string, unknown>} [params.body]
 * @returns {Promise<WhatsAppApiResult>}
 */
export async function whatsappGraphRequest({ accessToken, path, method = 'GET', body }) {
  const url = graphUrl(path);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `WhatsApp API HTTP ${res.status}`;
      return {
        ok: false,
        status: res.status,
        data,
        error: message,
        retryable: res.status >= 500 || res.status === 429,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    logger.error('WhatsApp Graph API request failed', {
      path,
      error: err.message,
    });
    return {
      ok: false,
      status: 0,
      data: {},
      error: err.message || 'Network error calling WhatsApp API',
      retryable: true,
    };
  }
}

/**
 * Verify tenant credentials against Meta Cloud API.
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} params.phoneNumberId
 * @param {string} params.wabaId
 */
export async function verifyWhatsAppCredentials({ accessToken, phoneNumberId, wabaId }) {
  const phoneResult = await whatsappGraphRequest({
    accessToken,
    path: `/${phoneNumberId}?fields=id,display_phone_number,verified_name`,
  });

  if (!phoneResult.ok) {
    return {
      valid: false,
      error: phoneResult.error || 'Failed to verify Phone Number ID',
    };
  }

  if (String(phoneResult.data?.id) !== String(phoneNumberId)) {
    return { valid: false, error: 'Phone Number ID mismatch from Meta API' };
  }

  const wabaResult = await whatsappGraphRequest({
    accessToken,
    path: `/${wabaId}?fields=id,name`,
  });

  if (!wabaResult.ok) {
    return {
      valid: false,
      error: wabaResult.error || 'Failed to verify WhatsApp Business Account ID',
    };
  }

  if (String(wabaResult.data?.id) !== String(wabaId)) {
    return { valid: false, error: 'WhatsApp Business Account ID mismatch from Meta API' };
  }

  return {
    valid: true,
    displayPhoneNumber: phoneResult.data.display_phone_number
      ? String(phoneResult.data.display_phone_number)
      : null,
    verifiedName: phoneResult.data.verified_name
      ? String(phoneResult.data.verified_name)
      : null,
    wabaName: wabaResult.data.name ? String(wabaResult.data.name) : null,
  };
}

/**
 * Send a free-form text message via Cloud API.
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} params.phoneNumberId
 * @param {string} params.to - E.164 digits without +
 * @param {string} params.body
 */
export async function sendWhatsAppTextMessage({ accessToken, phoneNumberId, to, body }) {
  return whatsappGraphRequest({
    accessToken,
    path: `/${phoneNumberId}/messages`,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: String(body).slice(0, 4096) },
    },
  });
}
