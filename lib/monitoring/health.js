/**
 * Liveness + readiness health checks for uptime monitors and ops.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { isSentryConfigured } from '@/lib/monitoring/sentry';
import { isWebPushConfigured } from '@/lib/push/config';

export function getLivenessStatus() {
  return {
    status: 'ok',
    service: 'vibe-alerts',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Deep readiness probe — Supabase, Redis (optional), config flags.
 */
export async function getReadinessStatus() {
  const checks = {};
  let ready = true;

  // Supabase
  try {
    const supabase = createAdminClient();
    const started = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    checks.supabase = {
      ok: !error,
      latencyMs: Date.now() - started,
      error: error?.message || null,
    };
    if (error) ready = false;
  } catch (err) {
    checks.supabase = { ok: false, error: err.message };
    ready = false;
  }

  // Upstash Redis (required in production for rate limits)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (redisUrl && redisToken) {
    try {
      const started = Date.now();
      const res = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
      checks.redis = {
        ok: res.ok,
        latencyMs: Date.now() - started,
        status: res.status,
      };
      if (!res.ok) ready = false;
    } catch (err) {
      checks.redis = { ok: false, error: err.message };
      ready = false;
    }
  } else {
    checks.redis = {
      ok: process.env.NODE_ENV !== 'production',
      configured: false,
      note:
        process.env.NODE_ENV === 'production'
          ? 'UPSTASH_REDIS_* required in production'
          : 'optional in development',
    };
    if (process.env.NODE_ENV === 'production') ready = false;
  }

  checks.config = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    sentry: isSentryConfigured(),
    webPush: isWebPushConfigured(),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  };

  return {
    status: ready ? 'ready' : 'degraded',
    ready,
    service: 'vibe-alerts',
    timestamp: new Date().toISOString(),
    checks,
  };
}
