import crypto from 'crypto';
import { getEnv } from '@/lib/env';

const SIGNATURE_HEADER = 'x-vibealerts-signature';
const TIMESTAMP_HEADER = 'x-vibealerts-timestamp';
const API_KEY_HEADER = 'x-vibealerts-key';

export { SIGNATURE_HEADER, TIMESTAMP_HEADER, API_KEY_HEADER };

/**
 * Verify HMAC-SHA256 signature: HMAC(secret, timestamp + "." + rawBody)
 * Also accepts API key as alternative auth for simpler CMS integrations.
 */
export function verifyWebhookRequest({ headers, rawBody, webhookSecret, apiKey }) {
  const signature = headers.get(SIGNATURE_HEADER);
  const timestamp = headers.get(TIMESTAMP_HEADER);
  const providedApiKey = headers.get(API_KEY_HEADER);

  // API key auth (for WordPress/Wix plugins that can't compute HMAC easily)
  if (providedApiKey && apiKey && timingSafeEqual(providedApiKey, apiKey)) {
    return { valid: true, method: 'api_key' };
  }

  if (!signature || !timestamp || !webhookSecret) {
    return { valid: false, method: 'hmac', error: 'Missing signature, timestamp, or secret' };
  }

  const { webhookTimestampTolerance } = getEnv();
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return { valid: false, method: 'hmac', error: 'Invalid timestamp' };
  }

  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSec > webhookTimestampTolerance) {
    return { valid: false, method: 'hmac', error: 'Timestamp expired (replay protection)' };
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const sigValue = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  if (!timingSafeEqual(sigValue, expected)) {
    return { valid: false, method: 'hmac', error: 'Invalid signature' };
  }

  return { valid: true, method: 'hmac' };
}

function timingSafeEqual(a, b) {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/** Generate HMAC signature for client-side test requests (dashboard only) */
export function signPayload(webhookSecret, rawBody) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return { timestamp, signature: `sha256=${signature}` };
}
