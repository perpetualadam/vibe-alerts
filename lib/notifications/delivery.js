/**
 * Notification delivery service with retry logic.
 * Uses the plugin registry — never references channels directly.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getEnabledProviders } from '@/lib/notifications';
import { logger } from '@/lib/logger';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000, 8000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {Object} params.profile
 * @param {Object} params.settings
 * @param {Record<string, import('./providers/base').ChannelEntry>} params.channelConfigs
 * @param {Record<string, string>} params.payload
 * @param {string} params.webhookEventId
 */
export async function deliverNotifications({
  userId,
  profile,
  settings,
  channelConfigs,
  payload,
  webhookEventId,
}) {
  const supabase = createAdminClient();
  const context = { userId, profile, settings, channelConfigs, payload, webhookEventId };

  const providers = getEnabledProviders(channelConfigs);
  const results = [];

  if (providers.length === 0) {
    logger.warn('No enabled notification plugins', { userId });
    return [{ channel: 'none', success: false, error: 'No channels enabled' }];
  }

  const configuredProviders = providers.filter((p) => p.isConfigured(context));

  if (configuredProviders.length === 0) {
    logger.warn('No configured notification plugins', { userId });
    return [{ channel: 'none', success: false, error: 'No channels configured' }];
  }

  for (const provider of configuredProviders) {
    const logEntry = await createNotificationLog(supabase, {
      userId,
      webhookEventId,
      channel: provider.id,
      payloadPreview: provider.formatPreview(payload),
    });

    const result = await sendWithRetry(provider, context);
    await updateNotificationLog(supabase, logEntry.id, result);
    results.push({ channel: provider.id, ...result });
  }

  return results;
}

async function createNotificationLog(supabase, { userId, webhookEventId, channel, payloadPreview }) {
  const { data, error } = await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      webhook_event_id: webhookEventId,
      channel,
      status: 'pending',
      payload_preview: payloadPreview,
      max_attempts: MAX_ATTEMPTS,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Failed to create notification log', { error: error.message });
    return { id: null };
  }

  return data;
}

async function sendWithRetry(provider, context) {
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await provider.send(context);

    if (result.success) {
      return { success: true, attemptCount: attempt, response: result.response };
    }

    lastError = result.error;
    lastResponse = result.response;

    if (!result.retryable || attempt === MAX_ATTEMPTS) break;

    logger.info('Retrying notification delivery', {
      channel: provider.id,
      attempt,
      error: result.error,
    });

    await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 5000);
  }

  return {
    success: false,
    attemptCount: MAX_ATTEMPTS,
    error: lastError,
    response: lastResponse,
  };
}

async function updateNotificationLog(supabase, logId, result) {
  if (!logId) return;

  await supabase
    .from('notification_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      attempt_count: result.attemptCount,
      provider_response: result.response ?? null,
      error_message: result.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

export async function processPendingRetries() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('status', 'retrying')
    .lte('next_retry_at', now)
    .limit(50);

  logger.info('Pending retry scan', { count: pending?.length ?? 0 });
}
