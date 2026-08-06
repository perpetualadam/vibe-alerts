/**
 * Optional Sentry error tracking. No-ops when SENTRY_DSN is unset.
 */

import { logger } from '@/lib/logger';

let initialized = false;

export function isSentryConfigured() {
  return Boolean(process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}

/**
 * Initialize Sentry once on the Node runtime.
 */
export async function initSentry() {
  if (initialized || !isSentryConfigured()) return false;
  try {
    const Sentry = await import('@sentry/nextjs');
    const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLE_DEV === '1',
    });
    initialized = true;
    logger.info('Sentry initialized');
    return true;
  } catch (err) {
    logger.warn('Sentry init failed', { error: err.message });
    return false;
  }
}

/**
 * @param {unknown} error
 * @param {Record<string, unknown>} [context]
 */
export async function captureException(error, context = {}) {
  if (!isSentryConfigured()) return;
  try {
    if (!initialized) await initSentry();
    const Sentry = await import('@sentry/nextjs');
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), 'error');
      }
    });
  } catch {
    // never throw from error reporting
  }
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export async function captureMessage(message, context = {}) {
  if (!isSentryConfigured()) return;
  try {
    if (!initialized) await initSentry();
    const Sentry = await import('@sentry/nextjs');
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureMessage(message, 'error');
    });
  } catch {
    // ignore
  }
}
