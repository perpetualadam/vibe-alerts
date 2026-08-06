/**
 * Analytics query façade — prefers Postgres RPCs for large-dataset aggregation.
 * Falls back to bounded client aggregation when RPCs are unavailable (local/dev).
 */

import {
  normalizeProviderFilter,
  resolveAnalyticsRange,
} from '@/lib/analytics/dates';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { logger } from '@/lib/logger';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} fn
 * @param {Record<string, unknown>} args
 */
async function rpcJson(supabase, fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

/**
 * @param {URLSearchParams|Object} input
 */
export function parseAnalyticsFilters(input) {
  const get = (key) =>
    typeof input.get === 'function' ? input.get(key) : input[key];

  const range = resolveAnalyticsRange(get('from'), get('to'));
  const provider = normalizeProviderFilter(get('provider'));
  return { ...range, provider };
}

/**
 * Load full analytics payload for the dashboard.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ fromIso: string, toIso: string, provider: string|null }} filters
 */
export async function fetchAnalyticsDashboard(supabase, userId, filters) {
  const providerArg = filters.provider;
  const rpcArgs = {
    p_from: filters.fromIso,
    p_to: filters.toIso,
    p_provider: providerArg,
  };

  try {
    const [overview, daily, monthly, topSources, channels, spam] = await Promise.all([
      rpcJson(supabase, 'analytics_overview', rpcArgs),
      rpcJson(supabase, 'analytics_daily_usage', rpcArgs),
      rpcJson(supabase, 'analytics_monthly_usage', rpcArgs),
      rpcJson(supabase, 'analytics_top_sources', {
        p_from: filters.fromIso,
        p_to: filters.toIso,
        p_limit: 8,
      }),
      rpcJson(supabase, 'analytics_channel_breakdown', rpcArgs),
      rpcJson(supabase, 'analytics_spam_stats', {
        p_from: filters.fromIso,
        p_to: filters.toIso,
      }),
    ]);

    return {
      overview: overview ?? {},
      daily: daily ?? [],
      monthly: monthly ?? [],
      topSources: topSources ?? [],
      channels: channels ?? [],
      spam: spam ?? overview?.spam ?? {},
      meta: {
        from: filters.fromIso,
        to: filters.toIso,
        provider: providerArg ?? 'all',
        source: 'rpc',
      },
    };
  } catch (err) {
    logger.warn('Analytics RPC unavailable; using fallback aggregation', {
      error: err.message,
      userId,
    });
    return fetchAnalyticsFallback(supabase, userId, filters);
  }
}

/**
 * Bounded fallback for environments without migration 007 RPCs.
 * Caps scanned rows to keep memory/time predictable.
 */
async function fetchAnalyticsFallback(supabase, userId, filters) {
  const ROW_CAP = 5000;
  const provider = filters.provider;

  const [eventsRes, logsRes, channelConfigs] = await Promise.all([
    supabase
      .from('webhook_events')
      .select(
        'id, processing_status, detected_platform, spam_score, spam_flagged, spam_signals, created_at, received_payload'
      )
      .eq('user_id', userId)
      .gte('created_at', filters.fromIso)
      .lte('created_at', filters.toIso)
      .order('created_at', { ascending: false })
      .limit(ROW_CAP),
    supabase
      .from('notification_logs')
      .select('id, channel, status, created_at, completed_at')
      .eq('user_id', userId)
      .gte('created_at', filters.fromIso)
      .lte('created_at', filters.toIso)
      .order('created_at', { ascending: false })
      .limit(ROW_CAP),
    fetchChannelConfigs(supabase, userId),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (logsRes.error) throw logsRes.error;

  const events = eventsRes.data ?? [];
  let logs = logsRes.data ?? [];
  if (provider) logs = logs.filter((l) => l.channel === provider);

  const successful = logs.filter((l) => l.status === 'sent');
  const failed = logs.filter((l) => l.status === 'failed');
  const durations = successful
    .filter((l) => l.completed_at)
    .map(
      (l) =>
        new Date(l.completed_at).getTime() - new Date(l.created_at).getTime()
    )
    .filter((ms) => Number.isFinite(ms) && ms >= 0);
  const avgMs =
    durations.length === 0
      ? 0
      : durations.reduce((a, b) => a + b, 0) / durations.length;

  const channelCounts = {};
  for (const log of successful) {
    channelCounts[log.channel] = (channelCounts[log.channel] || 0) + 1;
  }
  const topChannel =
    Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const sourceCounts = {};
  for (const event of events) {
    if (!['completed', 'failed', 'processing', 'pending'].includes(event.processing_status)) {
      continue;
    }
    const source =
      event.detected_platform ||
      event.received_payload?._detected_platform ||
      'webhook';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }

  const dayMap = new Map();
  const ensureDay = (iso) => {
    const day = iso.slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { day, webhooks: 0, sent: 0, failed: 0 });
    return dayMap.get(day);
  };
  for (const event of events) ensureDay(event.created_at).webhooks += 1;
  for (const log of logs) {
    const row = ensureDay(log.created_at);
    if (log.status === 'sent') row.sent += 1;
    if (log.status === 'failed') row.failed += 1;
  }

  const monthMap = new Map();
  const ensureMonth = (iso) => {
    const month = iso.slice(0, 7);
    if (!monthMap.has(month)) {
      monthMap.set(month, { month, webhooks: 0, sent: 0, failed: 0 });
    }
    return monthMap.get(month);
  };
  for (const event of events) ensureMonth(event.created_at).webhooks += 1;
  for (const log of logs) {
    const row = ensureMonth(log.created_at);
    if (log.status === 'sent') row.sent += 1;
    if (log.status === 'failed') row.failed += 1;
  }

  const channelBreakdownMap = {};
  for (const log of logs) {
    if (!channelBreakdownMap[log.channel]) {
      channelBreakdownMap[log.channel] = {
        provider: log.channel,
        total: 0,
        sent: 0,
        failed: 0,
        durationSum: 0,
        durationCount: 0,
      };
    }
    const row = channelBreakdownMap[log.channel];
    row.total += 1;
    if (log.status === 'sent') {
      row.sent += 1;
      if (log.completed_at) {
        const ms =
          new Date(log.completed_at).getTime() - new Date(log.created_at).getTime();
        if (Number.isFinite(ms) && ms >= 0) {
          row.durationSum += ms;
          row.durationCount += 1;
        }
      }
    }
    if (log.status === 'failed') row.failed += 1;
  }

  const spamFlagged = events.filter((e) => e.spam_flagged).length;
  const scores = events
    .map((e) => e.spam_score)
    .filter((s) => typeof s === 'number');
  const signalCounts = {};
  for (const event of events) {
    if (!event.spam_flagged || !Array.isArray(event.spam_signals)) continue;
    for (const signal of event.spam_signals) {
      signalCounts[signal] = (signalCounts[signal] || 0) + 1;
    }
  }

  const spamDailyMap = new Map();
  for (const event of events) {
    const day = event.created_at.slice(0, 10);
    if (!spamDailyMap.has(day)) spamDailyMap.set(day, { day, scanned: 0, flagged: 0 });
    const row = spamDailyMap.get(day);
    row.scanned += 1;
    if (event.spam_flagged) row.flagged += 1;
  }

  return {
    overview: {
      totalWebhooks: events.length,
      notificationsSent: logs.length,
      successfulDeliveries: successful.length,
      failedDeliveries: failed.length,
      averageDeliveryTimeMs: Math.round(avgMs * 10) / 10,
      activeProviders: Object.values(channelConfigs).filter((c) => c.enabled).length,
      topChannel,
      spam: {
        scanned: events.length,
        flagged: spamFlagged,
        averageScore:
          scores.length === 0
            ? 0
            : Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 1000
              ) / 1000,
      },
    },
    daily: [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day)),
    monthly: [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    topSources: Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    channels: Object.values(channelBreakdownMap)
      .map((row) => ({
        provider: row.provider,
        total: row.total,
        sent: row.sent,
        failed: row.failed,
        avgDeliveryMs:
          row.durationCount === 0
            ? 0
            : Math.round((row.durationSum / row.durationCount) * 10) / 10,
      }))
      .sort((a, b) => b.total - a.total),
    spam: {
      scanned: events.length,
      flagged: spamFlagged,
      clean: events.length - spamFlagged,
      averageScore:
        scores.length === 0
          ? 0
          : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) /
            1000,
      flagRate: events.length === 0 ? 0 : spamFlagged / events.length,
      daily: [...spamDailyMap.values()].sort((a, b) => a.day.localeCompare(b.day)),
      topSignals: Object.entries(signalCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    },
    meta: {
      from: filters.fromIso,
      to: filters.toIso,
      provider: provider ?? 'all',
      source: 'fallback',
      capped: events.length >= ROW_CAP || logs.length >= ROW_CAP,
    },
  };
}
