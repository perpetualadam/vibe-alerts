/**
 * Web Push send + subscribe helpers.
 */

import webpush from 'web-push';
import { logger } from '@/lib/logger';
import { getVapidConfig, isWebPushConfigured } from '@/lib/push/config';
import {
  deletePushSubscription,
  disablePushSubscription,
  listPushSubscriptions,
  listPushSubscriptionsWithKeys,
  touchPushSubscription,
  upsertPushSubscription,
} from '@/lib/push/db';

let vapidReady = false;

function ensureVapid() {
  if (vapidReady) return true;
  const cfg = getVapidConfig();
  if (!cfg.configured) return false;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  vapidReady = true;
  return true;
}

/**
 * @param {string} userId
 */
export async function getPushStatus(userId) {
  const configured = isWebPushConfigured();
  const subscriptions = configured ? await listPushSubscriptions(userId) : [];
  return {
    configured,
    supportedHint: 'Requires a Chromium/Safari browser with Notification permission.',
    subscriptionCount: subscriptions.length,
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      endpoint: s.endpoint.slice(0, 48) + '…',
      createdAt: s.created_at,
      lastNotifiedAt: s.last_notified_at,
    })),
    publicKey: configured ? getVapidConfig().publicKey : null,
  };
}

/**
 * @param {string} userId
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {string} [userAgent]
 */
export async function subscribePush(userId, subscription, userAgent) {
  if (!isWebPushConfigured()) {
    return { ok: false, status: 503, error: 'Web Push is not configured on this deployment.' };
  }
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { ok: false, status: 400, error: 'Invalid push subscription payload' };
  }

  const row = await upsertPushSubscription({
    userId,
    endpoint: String(subscription.endpoint),
    p256dh: String(subscription.keys.p256dh),
    auth: String(subscription.keys.auth),
    userAgent,
  });

  return { ok: true, status: 200, subscription: row };
}

/**
 * @param {string} userId
 * @param {string} endpoint
 */
export async function unsubscribePush(userId, endpoint) {
  if (!endpoint) {
    return { ok: false, status: 400, error: 'endpoint is required' };
  }
  await deletePushSubscription(userId, endpoint);
  return { ok: true, status: 200 };
}

/**
 * Send a Web Push message to all of a user's browser subscriptions.
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
export async function sendPushToUser(userId, payload) {
  if (!ensureVapid()) {
    return { sent: 0, skipped: true };
  }

  const rows = await listPushSubscriptionsWithKeys(userId);
  if (rows.length === 0) return { sent: 0, skipped: false };

  const body = JSON.stringify({
    title: payload.title || 'VibeAlerts',
    body: payload.body || 'New alert',
    url: payload.url || '/dashboard/notifications',
    tag: payload.tag || 'vibealerts',
  });

  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 60 * 60, urgency: 'normal' }
      );
      await touchPushSubscription(row.id);
      sent += 1;
    } catch (err) {
      const status = err?.statusCode || err?.status;
      logger.warn('Web Push delivery failed', {
        userId,
        status,
        error: err?.message,
      });
      // Gone / expired subscription
      if (status === 404 || status === 410) {
        await disablePushSubscription(row.id);
      }
    }
  }

  return { sent, skipped: false };
}

/**
 * Best-effort push after a webhook/notification fan-out.
 * @param {string} userId
 * @param {Record<string, string>} payload
 * @param {Array<{ channel: string, success: boolean }>} delivery
 */
export async function notifyUserPush(userId, payload, delivery) {
  try {
    if (!isWebPushConfigured()) return;
    const anySuccess = delivery?.some((d) => d.success);
    if (!anySuccess) return;

    const name = payload?.name || payload?.Name || payload?.email || 'New lead';
    const message = payload?.message || payload?.Message || payload?.event || 'Form submission received';
    await sendPushToUser(userId, {
      title: `VibeAlerts · ${String(name).slice(0, 60)}`,
      body: String(message).slice(0, 140),
      url: '/dashboard/notifications',
      tag: 'vibealerts-lead',
    });
  } catch (err) {
    logger.warn('notifyUserPush failed', { userId, error: err?.message });
  }
}
