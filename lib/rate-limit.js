/**
 * Rate limiting for webhook endpoints.
 * Uses Upstash Redis when configured; falls back to in-memory for single-instance dev.
 */

import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

const memoryStore = new Map();

function memoryRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - entry.windowStart) };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

async function upstashRateLimit(key, limit, windowMs) {
  const { upstashRedisUrl, upstashRedisToken } = getEnv();
  if (!upstashRedisUrl || !upstashRedisToken) return null;

  const windowSec = Math.ceil(windowMs / 1000);
  const url = `${upstashRedisUrl}/pipeline`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashRedisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSec, 'NX'],
    ]),
  });

  if (!res.ok) {
    logger.warn('Upstash rate limit failed, falling back to memory', { status: res.status });
    return null;
  }

  const [[, count]] = await res.json();
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMs: allowed ? undefined : windowMs,
  };
}

/**
 * @param {string} identifier - e.g. userId or IP
 * @param {number} limit - max requests per window
 * @param {number} windowMs - window size in ms (default 60s)
 */
export async function checkRateLimit(identifier, limit = 60, windowMs = 60_000) {
  const key = `ratelimit:webhook:${identifier}`;

  try {
    const upstash = await upstashRateLimit(key, limit, windowMs);
    if (upstash) return upstash;
  } catch (err) {
    logger.warn('Rate limit error', { error: err.message });
  }

  if (process.env.NODE_ENV === 'production') {
    logger.error('Upstash rate limit unavailable in production');
    return { allowed: true, remaining: limit };
  }

  return memoryRateLimit(key, limit, windowMs);
}

export function rateLimitHeaders(result, limit) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining ?? 0),
    ...(result.retryAfterMs
      ? { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) }
      : {}),
  };
}
