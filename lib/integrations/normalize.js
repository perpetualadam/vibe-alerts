import { PLATFORM_HEADER } from '@/lib/integrations/constants';
import { getPlatform, getAllPlatforms } from '@/lib/integrations/registry';

/**
 * Resolve platform id from header or payload auto-detection.
 * @param {Headers} headers
 * @param {unknown} parsedBody
 */
export function detectPlatform(headers, parsedBody) {
  const explicit = headers.get(PLATFORM_HEADER)?.toLowerCase().trim();
  if (explicit && getPlatform(explicit)) {
    return explicit;
  }

  for (const platform of getAllPlatforms()) {
    if (platform.detectPayload(parsedBody)) {
      return platform.id;
    }
  }

  return null;
}

/**
 * Normalize a parsed JSON body using the appropriate platform adapter.
 * @param {unknown} parsedBody
 * @param {Headers} headers
 * @returns {{ platform: string | null, payload: Record<string, string> }}
 */
export function normalizePlatformPayload(parsedBody, headers) {
  const platformId = detectPlatform(headers, parsedBody);
  if (!platformId) {
    if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
      return {
        platform: null,
        payload: /** @type {Record<string, string>} */ (
          Object.fromEntries(
            Object.entries(parsedBody).map(([k, v]) => [k, String(v ?? '')])
          )
        ),
      };
    }
    return { platform: null, payload: {} };
  }

  const adapter = getPlatform(platformId);
  return {
    platform: platformId,
    payload: adapter.normalizePayload(parsedBody),
  };
}

/**
 * Parse raw JSON body and normalize for webhook processing.
 * @param {string} rawBody
 * @param {Headers} headers
 */
export function parseAndNormalizeBody(rawBody, headers) {
  if (!rawBody?.length) {
    return { ok: false, status: 400, error: 'Empty request body' };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: 'Payload must be a JSON object' };
  }

  const { platform, payload } = normalizePlatformPayload(parsed, headers);

  return {
    ok: true,
    platform,
    body: JSON.stringify(payload),
  };
}
