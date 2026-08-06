/**
 * NotificationService — single orchestrator between webhooks and providers.
 *
 * Flow:
 *   Webhook → NotificationService → Enabled Providers
 *
 * The webhook endpoint never imports or calls providers directly.
 * One inbound event fans out to every enabled & configured provider
 * (Telegram, Email, Discord, Teams, WhatsApp, Slack, …).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAllPlugins,
  getEnabledProviders,
  getPlugin,
} from '@/lib/notifications/registry';
import { DEFAULT_TEST_PAYLOAD } from '@/lib/notifications/providers/base';
import { logger } from '@/lib/logger';
import { getWhatsAppConnectionPublic } from '@/lib/whatsapp/db';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000, 8000];

/**
 * @typedef {import('./providers/base').NotificationContext} NotificationContext
 * @typedef {import('./providers/base').DeliveryResult} DeliveryResult
 * @typedef {import('./providers/base').ChannelEntry} ChannelEntry
 * @typedef {import('./providers/base').HealthCheckResult} HealthCheckResult
 * @typedef {import('./providers/base').NotificationProvider} NotificationProvider
 */

/**
 * @typedef {Object} NotifyParams
 * @property {string} userId
 * @property {Record<string, unknown>} profile
 * @property {Record<string, unknown>} settings
 * @property {Record<string, ChannelEntry>} channelConfigs
 * @property {Record<string, string>} payload
 * @property {string} [webhookEventId]
 * @property {boolean} [isTest]
 */

/**
 * @typedef {DeliveryResult & { channel: string, attemptCount?: number }} ProviderDeliveryResult
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enrich channel configs with live WhatsApp connection state for delivery gating.
 * @param {string} userId
 * @param {Record<string, ChannelEntry>} channelConfigs
 */
async function withWhatsAppConnectionState(userId, channelConfigs) {
  const whatsapp = channelConfigs?.whatsapp;
  if (!whatsapp?.enabled) return channelConfigs;

  try {
    const connection = await getWhatsAppConnectionPublic(userId);
    if (!connection.connected) return channelConfigs;

    return {
      ...channelConfigs,
      whatsapp: {
        ...whatsapp,
        connected_at: whatsapp.connected_at || connection.connectedAt || undefined,
        config: {
          ...(whatsapp.config ?? {}),
          whatsapp_connected: true,
        },
      },
    };
  } catch (err) {
    logger.warn('Could not enrich WhatsApp connection state for delivery', {
      userId,
      error: err.message,
    });
    return channelConfigs;
  }
}

export class NotificationService {
  /**
   * Deliver a payload to every enabled & configured provider.
   * @param {NotifyParams} params
   * @returns {Promise<ProviderDeliveryResult[]>}
   */
  async notify(params) {
    const {
      userId,
      profile,
      settings,
      channelConfigs,
      payload,
      webhookEventId,
      isTest = false,
    } = params;

    const supabase = createAdminClient();
    const enrichedConfigs = await withWhatsAppConnectionState(userId, channelConfigs);
    /** @type {NotificationContext} */
    const context = {
      userId,
      profile,
      settings,
      channelConfigs: enrichedConfigs,
      payload,
      webhookEventId,
    };

    const providers = this.getEnabledProviders(enrichedConfigs);
    /** @type {ProviderDeliveryResult[]} */
    const results = [];

    if (providers.length === 0) {
      logger.warn('No enabled notification providers', { userId, isTest });
      return [{ channel: 'none', success: false, error: 'No channels enabled' }];
    }

    const configuredProviders = providers.filter((p) => p.isConfigured(context));

    if (configuredProviders.length === 0) {
      logger.warn('No configured notification providers', { userId, isTest });
      return [{ channel: 'none', success: false, error: 'No channels configured' }];
    }

    for (const provider of configuredProviders) {
      const logEntry = await this.#createNotificationLog(supabase, {
        userId,
        webhookEventId,
        channel: provider.id,
        payloadPreview: provider.formatPreview(payload),
      });

      const result = await this.#invokeWithRetry(provider, context, isTest);
      await this.#updateNotificationLog(supabase, logEntry.id, result);
      results.push({ channel: provider.id, ...result });
    }

    // Best-effort browser Web Push (PWA) — never block provider delivery
    if (!isTest) {
      import('@/lib/push/service')
        .then(({ notifyUserPush }) => notifyUserPush(userId, payload, results))
        .catch(() => {});
    }

    return results;
  }

  /**
   * Run provider.test() on every enabled & configured provider.
   * @param {Omit<NotifyParams, 'payload' | 'isTest'> & { payload?: Record<string, string>, channels?: string[] }} params
   * @returns {Promise<ProviderDeliveryResult[]>}
   */
  async test(params) {
    const payload = params.payload ?? DEFAULT_TEST_PAYLOAD;
    let channelConfigs = params.channelConfigs;

    if (Array.isArray(params.channels) && params.channels.length > 0) {
      /** @type {Record<string, ChannelEntry>} */
      const filtered = {};
      for (const id of params.channels) {
        if (channelConfigs[id]) filtered[id] = channelConfigs[id];
      }
      channelConfigs = filtered;
    }

    return this.notify({
      ...params,
      channelConfigs,
      payload,
      isTest: true,
    });
  }

  /**
   * Health-check providers. When channelConfigs are provided, reports
   * per-tenant readiness for enabled channels; otherwise platform-level only.
   *
   * @param {Object} [options]
   * @param {Record<string, ChannelEntry>} [options.channelConfigs]
   * @param {string} [options.userId]
   * @param {string[]} [options.providerIds]
   * @returns {Promise<HealthCheckResult[]>}
   */
  async healthCheck(options = {}) {
    const { channelConfigs, userId = '', providerIds } = options;
    const plugins = getAllPlugins().filter((plugin) =>
      providerIds?.length ? providerIds.includes(plugin.id) : true
    );

    /** @type {NotificationContext | undefined} */
    const context = channelConfigs
      ? {
          userId,
          profile: {},
          settings: {},
          channelConfigs,
          payload: {},
        }
      : undefined;

    const results = await Promise.all(
      plugins.map((plugin) => plugin.provider.healthCheck(context))
    );
    return results;
  }

  /**
   * Resolve enabled provider instances from tenant channel configs.
   * @param {Record<string, ChannelEntry>} channelConfigs
   * @returns {NotificationProvider[]}
   */
  getEnabledProviders(channelConfigs) {
    return getEnabledProviders(channelConfigs);
  }

  /**
   * @param {string} providerId
   * @returns {NotificationProvider | null}
   */
  getProvider(providerId) {
    return getPlugin(providerId)?.provider ?? null;
  }

  /**
   * @param {NotificationProvider} provider
   * @param {NotificationContext} context
   * @param {boolean} isTest
   * @returns {Promise<DeliveryResult & { attemptCount: number }>}
   */
  async #invokeWithRetry(provider, context, isTest) {
    let lastError = null;
    let lastResponse = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = isTest
        ? await provider.test(context)
        : await provider.send(context);

      if (result.success) {
        return { success: true, attemptCount: attempt, response: result.response };
      }

      lastError = result.error;
      lastResponse = result.response;

      if (!result.retryable || attempt === MAX_ATTEMPTS) break;

      logger.info('Retrying notification delivery', {
        channel: provider.id,
        attempt,
        isTest,
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

  async #createNotificationLog(supabase, { userId, webhookEventId, channel, payloadPreview }) {
    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        webhook_event_id: webhookEventId ?? null,
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

  async #updateNotificationLog(supabase, logId, result) {
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
}

/** Shared singleton used by webhook + dashboard routes. */
export const notificationService = new NotificationService();

/**
 * Back-compat alias used by the webhook processor.
 * Prefer notificationService.notify().
 * @param {NotifyParams} params
 */
export async function deliverNotifications(params) {
  return notificationService.notify(params);
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
