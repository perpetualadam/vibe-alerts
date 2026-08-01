/**
 * Database helpers for the channel_configs table.
 */

/**
 * @typedef {Object} ChannelConfigRow
 * @property {string} channel
 * @property {Record<string, unknown>} config
 * @property {boolean} enabled
 * @property {string} [connected_at]
 */

/**
 * @param {ChannelConfigRow[]} rows
 * @returns {Record<string, import('./providers/base').ChannelEntry>}
 */
export function rowsToChannelConfigMap(rows) {
  /** @type {Record<string, import('./providers/base').ChannelEntry>} */
  const map = {};

  for (const row of rows ?? []) {
    map[row.channel] = {
      enabled: row.enabled,
      config: /** @type {Record<string, string>} */ (row.config ?? {}),
      connected_at: row.connected_at,
    };
  }

  return map;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function fetchChannelConfigs(supabase, userId) {
  const { data, error } = await supabase
    .from('channel_configs')
    .select('channel, config, enabled, connected_at')
    .eq('user_id', userId);

  if (error) throw error;
  return rowsToChannelConfigMap(data ?? []);
}

/**
 * Upsert a channel config row.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} params
 */
export async function upsertChannelConfig(supabase, { userId, channel, config, enabled }) {
  const row = {
    user_id: userId,
    channel,
    config,
    enabled,
  };

  if (config && Object.values(config).some((v) => v != null && String(v).trim() !== '')) {
    row.connected_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('channel_configs')
    .upsert(row, { onConflict: 'user_id,channel' })
    .select('channel, config, enabled, connected_at')
    .single();

  if (error) throw error;
  return data;
}
