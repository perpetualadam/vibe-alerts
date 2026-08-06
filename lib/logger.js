/**
 * Structured server-side logging with environment-based levels.
 * Never log secrets, tokens, or full payloads in production.
 * Errors are forwarded to Sentry when configured.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel() {
  const env = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  return LEVELS[env] ?? LEVELS.info;
}

function shouldLog(level) {
  return LEVELS[level] >= currentLevel();
}

function formatMessage(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    service: 'vibe-alerts',
    ...(meta && Object.keys(meta).length > 0 ? { meta: sanitizeMeta(meta) } : {}),
  };
  return JSON.stringify(entry);
}

/** Strip sensitive keys from log metadata */
function sanitizeMeta(meta) {
  const sensitive = /secret|token|password|key|authorization|signature|cookie/i;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (sensitive.test(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string' && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function reportErrorToSentry(message, meta) {
  if (typeof window !== 'undefined') return;
  import('@/lib/monitoring/sentry')
    .then(({ captureException, captureMessage }) => {
      const err = meta?.error;
      if (err instanceof Error) {
        return captureException(err, { message, ...sanitizeMeta(meta || {}) });
      }
      if (typeof err === 'string') {
        return captureMessage(`${message}: ${err}`, { ...sanitizeMeta(meta || {}) });
      }
      return captureMessage(message, sanitizeMeta(meta || {}));
    })
    .catch(() => {});
}

export const logger = {
  debug(message, meta) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, meta));
  },
  info(message, meta) {
    if (shouldLog('info')) console.info(formatMessage('info', message, meta));
  },
  warn(message, meta) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  error(message, meta) {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
    reportErrorToSentry(message, meta);
  },
};
