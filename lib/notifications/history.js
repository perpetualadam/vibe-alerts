/**
 * Notification history & per-provider summary helpers (Supabase queries).
 */

/** Preferred display order for the Notifications dashboard */
export const DASHBOARD_PROVIDER_ORDER = [
  'telegram',
  'discord',
  'email',
  'teams',
  'whatsapp',
  'slack',
];

/**
 * @param {string} ms
 * @returns {string|null}
 */
export function formatDeliveryDuration(createdAt, completedAt) {
  if (!createdAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

/**
 * Derive a human-readable source label for a log row.
 * @param {Object} row
 */
export function resolveNotificationSource(row) {
  if (!row?.webhook_event_id) return 'Dashboard test';
  const payload = row.webhook_events?.received_payload;
  if (payload && typeof payload === 'object') {
    const platform = payload._detected_platform || payload.platform || payload.source;
    if (platform) return String(platform);
  }
  return 'Webhook';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} channel
 * @param {'sent'|'failed'} status
 */
async function latestLogForStatus(supabase, userId, channel, status) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id, status, error_message, created_at, completed_at')
    .eq('user_id', userId)
    .eq('channel', channel)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * Build per-provider last success / last failure summaries.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string[]} channels
 */
export async function fetchProviderDeliverySummary(supabase, userId, channels) {
  /** @type {Record<string, { lastSuccess: object|null, lastFailure: object|null }>} */
  const summary = {};

  await Promise.all(
    channels.map(async (channel) => {
      const [lastSuccess, lastFailure] = await Promise.all([
        latestLogForStatus(supabase, userId, channel, 'sent'),
        latestLogForStatus(supabase, userId, channel, 'failed'),
      ]);
      summary[channel] = { lastSuccess, lastFailure };
    })
  );

  return summary;
}

/**
 * @typedef {Object} HistoryFilters
 * @property {string} [provider]
 * @property {'success'|'failure'|'all'|string} [outcome]
 * @property {string} [from] ISO date
 * @property {string} [to] ISO date
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * Filtered notification history for the dashboard table.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {HistoryFilters} filters
 */
export async function fetchNotificationHistory(supabase, userId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  let query = supabase
    .from('notification_logs')
    .select(
      `
      id,
      channel,
      status,
      error_message,
      created_at,
      completed_at,
      attempt_count,
      payload_preview,
      webhook_event_id,
      webhook_events ( received_payload )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.provider && filters.provider !== 'all') {
    query = query.eq('channel', filters.provider);
  }

  const outcome = filters.outcome || filters.status || 'all';
  if (outcome === 'success' || outcome === 'sent') {
    query = query.eq('status', 'sent');
  } else if (outcome === 'failure' || outcome === 'failed') {
    query = query.eq('status', 'failed');
  }

  if (filters.from) {
    const from = new Date(filters.from);
    if (!Number.isNaN(from.getTime())) {
      query = query.gte('created_at', from.toISOString());
    }
  }

  if (filters.to) {
    const to = new Date(filters.to);
    if (!Number.isNaN(to.getTime())) {
      // Inclusive end-of-day when only a date is provided
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(filters.to).trim())) {
        to.setUTCHours(23, 59, 59, 999);
      }
      query = query.lte('created_at', to.toISOString());
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    time: row.created_at,
    source: resolveNotificationSource(row),
    provider: row.channel,
    status: row.status,
    deliveryTime: formatDeliveryDuration(row.created_at, row.completed_at),
    error: row.error_message ?? null,
    completedAt: row.completed_at,
    attemptCount: row.attempt_count,
    payloadPreview: row.payload_preview,
  }));

  return {
    rows,
    total: count ?? rows.length,
    limit,
    offset,
  };
}

/**
 * Whether a provider looks connected for the tenant (credentials present).
 * @param {Object} plugin - catalog entry
 * @param {Object} [entry] - channel_configs entry
 * @param {Object} [whatsappStatus]
 */
export function isProviderConnected(plugin, entry, whatsappStatus) {
  if (!plugin) return false;
  if (plugin.platformReady === false) return false;

  if (plugin.id === 'whatsapp') {
    return Boolean(whatsappStatus?.connection?.connected);
  }

  const config = entry?.config ?? {};
  if (!plugin.configSchema?.length) return Boolean(entry?.connected_at);
  return plugin.configSchema.every((field) => {
    if (!field.required) return true;
    return Boolean(String(config[field.key] ?? '').trim());
  });
}
