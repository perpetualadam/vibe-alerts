/**
 * Async notification retry queue + dead-letter helpers.
 * Sync path does short exponential backoff; durable retries are scheduled here.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/monitoring/sentry';

/** Max durable (async) delivery attempts after sync retries */
export const ASYNC_MAX_ATTEMPTS = 5;

/**
 * Exponential backoff in seconds: 60, 120, 240, 480, 960 (cap 1h)
 * @param {number} attemptCount - attempts already made
 */
export function computeNextRetryDelaySeconds(attemptCount) {
  const exp = Math.max(0, attemptCount - 1);
  return Math.min(3600, 60 * 2 ** exp);
}

/**
 * Schedule a notification log for async retry.
 * @param {Object} params
 */
export async function enqueueNotificationRetry({
  logId,
  attemptCount,
  error,
  response,
  maxAttempts = ASYNC_MAX_ATTEMPTS,
}) {
  if (!logId) return { queued: false };

  if (attemptCount >= maxAttempts) {
    await moveToDeadLetter({ logId, attemptCount, error, response });
    return { queued: false, dead: true };
  }

  const delaySec = computeNextRetryDelaySeconds(attemptCount);
  const nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from('notification_logs')
    .update({
      status: 'retrying',
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
      error_message: error || null,
      provider_response: response ?? null,
      next_retry_at: nextRetryAt,
      completed_at: null,
    })
    .eq('id', logId);

  if (updateError) {
    logger.error('Failed to enqueue notification retry', {
      logId,
      error: updateError.message,
    });
    return { queued: false };
  }

  logger.info('Notification queued for retry', {
    logId,
    attemptCount,
    nextRetryAt,
    delaySec,
  });

  return { queued: true, nextRetryAt, delaySec };
}

/**
 * @param {Object} params
 */
export async function moveToDeadLetter({
  logId,
  attemptCount,
  error,
  response,
}) {
  const supabase = createAdminClient();
  const { data: log } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (!log) return;

  await supabase
    .from('notification_logs')
    .update({
      status: 'dead',
      attempt_count: attemptCount,
      error_message: error || log.error_message,
      provider_response: response ?? log.provider_response,
      completed_at: new Date().toISOString(),
      next_retry_at: null,
    })
    .eq('id', logId);

  const { error: dlqError } = await supabase.from('notification_dead_letters').insert({
    notification_log_id: logId,
    user_id: log.user_id,
    webhook_event_id: log.webhook_event_id,
    channel: log.channel,
    payload_preview: log.payload_preview,
    error_message: error || log.error_message,
    attempt_count: attemptCount,
    provider_response: response ?? log.provider_response,
  });

  if (dlqError) {
    logger.error('Failed to insert dead letter', { logId, error: dlqError.message });
    await captureException(dlqError, { logId, channel: log.channel });
  } else {
    logger.warn('Notification moved to dead letter queue', {
      logId,
      channel: log.channel,
      attemptCount,
    });
  }
}

/**
 * Process due retrying notification logs (called by cron).
 * @param {{ limit?: number }} [options]
 */
export async function processPendingRetries(options = {}) {
  const limit = options.limit ?? 50;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('status', 'retrying')
    .lte('next_retry_at', now)
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('Retry queue query failed', { error: error.message });
    await captureException(error, { scope: 'retry-queue' });
    return { processed: 0, succeeded: 0, failed: 0, dead: 0, error: error.message };
  }

  const rows = pending || [];
  let succeeded = 0;
  let failed = 0;
  let dead = 0;

  const { notificationService } = await import('@/lib/notifications/service');

  for (const row of rows) {
    try {
      const result = await redeliverNotificationLog(row, notificationService);
      if (result.success) {
        succeeded += 1;
      } else if (result.dead) {
        dead += 1;
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      logger.error('Retry redelivery crashed', {
        logId: row.id,
        error: err.message,
      });
      await captureException(err, { logId: row.id, channel: row.channel });
      await enqueueNotificationRetry({
        logId: row.id,
        attemptCount: (row.attempt_count || 0) + 1,
        error: err.message,
        maxAttempts: row.max_attempts || ASYNC_MAX_ATTEMPTS,
      });
    }
  }

  logger.info('Retry queue processed', {
    processed: rows.length,
    succeeded,
    failed,
    dead,
  });

  return { processed: rows.length, succeeded, failed, dead };
}

/**
 * @param {Record<string, unknown>} row
 * @param {import('./service').NotificationService} notificationService
 */
async function redeliverNotificationLog(row, notificationService) {
  const supabase = createAdminClient();
  const userId = String(row.user_id);
  const channel = String(row.channel);

  const [{ data: profile }, { data: settings }, channelConfigs, { data: event }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      fetchChannelConfigs(supabase, userId),
      row.webhook_event_id
        ? supabase
            .from('webhook_events')
            .select('received_payload')
            .eq('id', row.webhook_event_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (!profile) {
    await moveToDeadLetter({
      logId: row.id,
      attemptCount: row.attempt_count || 0,
      error: 'User profile missing',
    });
    return { success: false, dead: true };
  }

  const rawPayload = event?.received_payload || {};
  /** @type {Record<string, string>} */
  const payload = {};
  for (const [k, v] of Object.entries(rawPayload)) {
    if (k.startsWith('_')) continue;
    if (v == null || typeof v === 'object') continue;
    payload[k] = String(v);
  }
  if (Object.keys(payload).length === 0) {
    payload.message = row.payload_preview || 'Retry delivery';
  }

  // Restrict to the single channel that failed
  const filteredConfigs = channelConfigs[channel]
    ? { [channel]: channelConfigs[channel] }
    : channelConfigs;

  const results = await notificationService.notify({
    userId,
    profile,
    settings: settings ?? {},
    channelConfigs: filteredConfigs,
    payload,
    webhookEventId: row.webhook_event_id || undefined,
    isTest: false,
    /** skip creating a new log — update the existing retrying row */
    existingLogId: row.id,
    existingAttemptCount: row.attempt_count || 0,
    skipAsyncEnqueue: false,
    isAsyncRetry: true,
  });

  const channelResult = results.find((r) => r.channel === channel) || results[0];
  return {
    success: Boolean(channelResult?.success),
    dead: channelResult?.dead || false,
  };
}

/**
 * Ops summary for admin dashboard.
 */
export async function getRetryQueueStats() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const [retrying, due, dead, failed24h] = await Promise.all([
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'retrying'),
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'retrying')
      .lte('next_retry_at', now),
    supabase
      .from('notification_dead_letters')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null),
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
  ]);

  return {
    retrying: retrying.count ?? 0,
    due: due.count ?? 0,
    deadLetters: dead.count ?? 0,
    failedLast24h: failed24h.count ?? 0,
  };
}
