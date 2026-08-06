/**
 * Date-range helpers for analytics filters.
 */

/**
 * @param {string|null|undefined} from
 * @param {string|null|undefined} to
 * @returns {{ from: Date, to: Date, fromIso: string, toIso: string }}
 */
export function resolveAnalyticsRange(from, to) {
  const now = new Date();
  let toDate = to ? new Date(to) : now;
  let fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000);

  if (Number.isNaN(toDate.getTime())) toDate = now;
  if (Number.isNaN(fromDate.getTime())) {
    fromDate = new Date(now.getTime() - 30 * 86400000);
  }

  // Inclusive end-of-day when only a date string is provided
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())) {
    toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(String(from).trim())) {
    fromDate = new Date(from);
    fromDate.setUTCHours(0, 0, 0, 0);
  }

  if (fromDate > toDate) {
    const tmp = fromDate;
    fromDate = toDate;
    toDate = tmp;
  }

  // Cap range at 366 days to protect large-tenant scans
  const maxMs = 366 * 86400000;
  if (toDate.getTime() - fromDate.getTime() > maxMs) {
    fromDate = new Date(toDate.getTime() - maxMs);
  }

  return {
    from: fromDate,
    to: toDate,
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
  };
}

/**
 * @param {string|null|undefined} provider
 */
export function normalizeProviderFilter(provider) {
  const value = String(provider ?? 'all').trim().toLowerCase();
  if (!value || value === 'all') return null;
  return value;
}

/**
 * Format ms for UI.
 * @param {number} ms
 */
export function formatMs(ms) {
  const n = Number(ms) || 0;
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)}s`;
  return `${(n / 60_000).toFixed(1)}m`;
}
