import { getEnv } from '@/lib/env';

const MAX_DEPTH = 5;
const MAX_KEYS = 100;
const MAX_STRING_LENGTH = 2000;
const MAX_KEY_LENGTH = 100;

/**
 * Parse and validate incoming webhook JSON.
 * Works with any website form: WordPress, Wix, Webflow, custom HTML, etc.
 */
export function parseAndValidatePayload(rawBody, maxBytesOverride) {
  const { webhookMaxPayloadBytes } = getEnv();
  const maxBytes = maxBytesOverride ?? webhookMaxPayloadBytes;

  if (!rawBody || rawBody.length === 0) {
    return { ok: false, status: 400, error: 'Empty request body' };
  }

  if (rawBody.length > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, status: 400, error: 'Payload must be a JSON object' };
  }

  const sanitized = sanitizeObject(data, 0);
  if (!sanitized.ok) {
    return { ok: false, status: 400, error: sanitized.error };
  }

  if (Object.keys(sanitized.value).length === 0) {
    return { ok: false, status: 400, error: 'Payload contains no fields' };
  }

  return { ok: true, data: sanitized.value };
}

function sanitizeObject(obj, depth) {
  if (depth > MAX_DEPTH) {
    return { ok: false, error: 'Payload nesting too deep' };
  }

  const result = {};
  let keyCount = 0;

  for (const [rawKey, rawValue] of Object.entries(obj)) {
    keyCount += 1;
    if (keyCount > MAX_KEYS) {
      return { ok: false, error: 'Too many fields in payload' };
    }

    const key = sanitizeKey(rawKey);
    if (!key) continue;

    const value = sanitizeValue(rawValue, depth);
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return { ok: true, value: result };
}

function sanitizeKey(key) {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim().slice(0, MAX_KEY_LENGTH);
  if (!trimmed) return null;
  // Strip markdown/formatting injection characters from keys
  return trimmed.replace(/[*_`~\[\]()\\]/g, '');
}

function sanitizeValue(value, depth) {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 20)
      .map((v) => sanitizeValue(v, depth + 1))
      .filter((v) => v !== undefined);
    return items.length ? items.join(', ') : undefined;
  }

  if (typeof value === 'object') {
    const nested = sanitizeObject(value, depth + 1);
    if (!nested.ok) return '[nested object]';
    const pairs = Object.entries(nested.value).map(([k, v]) => `${k}: ${v}`);
    return pairs.length ? pairs.join('; ') : undefined;
  }

  return undefined;
}

/** Escape Telegram MarkdownV2 special characters in values */
export function escapeMarkdown(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
