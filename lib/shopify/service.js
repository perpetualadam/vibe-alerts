/**
 * High-level Shopify App service for VibeAlerts tenants.
 */

import crypto from 'crypto';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { isCredentialEncryptionReady } from '@/lib/security/credentials';
import { notificationService } from '@/lib/notifications/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import {
  getShopifyEnv,
  isShopifyAppConfigured,
  normalizeShopDomain,
} from '@/lib/shopify/config';
import {
  claimShopifyWebhookEvent,
  disconnectShopifyForUser,
  getShopifyAccessToken,
  getShopifyShopByDomain,
  getShopifyShopForUser,
  markShopifyShopDisconnected,
  toPublicShopifyShop,
  touchShopifyWebhook,
  updateShopifyTopicsAndWebhooks,
  upsertShopifyShop,
} from '@/lib/shopify/db';
import {
  buildShopifyAuthUrl,
  exchangeShopifyCode,
  parseOAuthState,
  validateShopifyOAuthHmac,
} from '@/lib/shopify/oauth';
import {
  DEFAULT_ENABLED_TOPICS,
  SELECTABLE_SHOPIFY_TOPICS,
  isNotifiableTopic,
  mapShopifyWebhookToPayload,
} from '@/lib/shopify/topics';
import { removeShopifyWebhooks, syncShopifyWebhooks } from '@/lib/shopify/webhooks';

export function getShopifyStatusForUser(userId) {
  return getShopifyShopForUser(userId).then((row) => ({
    platformReady: isShopifyAppConfigured() && isCredentialEncryptionReady(),
    appConfigured: isShopifyAppConfigured(),
    encryptionReady: isCredentialEncryptionReady(),
    connection: toPublicShopifyShop(row),
    availableTopics: SELECTABLE_SHOPIFY_TOPICS,
  }));
}

/**
 * Start OAuth install for a logged-in VibeAlerts user.
 * @param {string} userId
 * @param {string} shopInput
 */
export function beginShopifyInstall(userId, shopInput) {
  if (!isShopifyAppConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Shopify App credentials are not configured on this deployment.',
    };
  }
  if (!isCredentialEncryptionReady()) {
    return {
      ok: false,
      status: 503,
      error: 'CREDENTIALS_ENCRYPTION_KEY is required to store Shopify access tokens.',
    };
  }

  const result = buildShopifyAuthUrl(shopInput, userId);
  if (!result.ok) {
    return { ok: false, status: 400, error: result.error };
  }
  return { ok: true, status: 200, url: result.url, shop: result.shop };
}

/**
 * Complete OAuth callback, persist token, subscribe webhooks.
 * @param {URLSearchParams} searchParams
 */
export async function completeShopifyInstall(searchParams) {
  const shop = normalizeShopDomain(searchParams.get('shop') || '');
  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';

  if (!shop || !code || !state) {
    return { ok: false, status: 400, error: 'Missing OAuth parameters' };
  }

  const validHmac = await validateShopifyOAuthHmac(searchParams);
  if (!validHmac) {
    return { ok: false, status: 401, error: 'Invalid OAuth HMAC' };
  }

  const parsed = parseOAuthState(state);
  if (!parsed || parsed.shop !== shop) {
    return { ok: false, status: 400, error: 'Invalid or expired OAuth state' };
  }

  const tokens = await exchangeShopifyCode(shop, code);
  const existing = await getShopifyShopForUser(parsed.userId);
  const enabledTopics = Array.isArray(existing?.enabled_topics)
    ? existing.enabled_topics
    : DEFAULT_ENABLED_TOPICS;

  await upsertShopifyShop({
    userId: parsed.userId,
    shopDomain: shop,
    accessToken: tokens.accessToken,
    scope: tokens.scope,
    enabledTopics,
  });

  const webhookIds = await syncShopifyWebhooks({
    shopDomain: shop,
    accessToken: tokens.accessToken,
    enabledTopics,
  });

  await updateShopifyTopicsAndWebhooks(shop, enabledTopics, webhookIds);

  logger.info('Shopify app installed', { shop, userId: parsed.userId });
  return { ok: true, status: 200, shop, userId: parsed.userId };
}

/**
 * Update merchant-selected notification topics and re-sync webhooks.
 * @param {string} userId
 * @param {string[]} topics
 */
export async function updateShopifyTopics(userId, topics) {
  const shop = await getShopifyShopForUser(userId);
  if (!shop?.shop_domain || !shop.connected) {
    return { ok: false, status: 400, error: 'Shopify is not connected' };
  }

  const selectable = new Set(SELECTABLE_SHOPIFY_TOPICS.map((t) => t.id));
  const enabledTopics = (topics || []).filter((t) => selectable.has(t));
  if (enabledTopics.length === 0) {
    return { ok: false, status: 400, error: 'Select at least one notification event' };
  }

  const accessToken = await getShopifyAccessToken(shop.shop_domain);
  if (!accessToken) {
    return { ok: false, status: 400, error: 'Shopify access token missing — reconnect the shop' };
  }

  const webhookIds = await syncShopifyWebhooks({
    shopDomain: shop.shop_domain,
    accessToken,
    enabledTopics,
  });

  const row = await updateShopifyTopicsAndWebhooks(
    shop.shop_domain,
    enabledTopics,
    webhookIds
  );

  return { ok: true, status: 200, connection: toPublicShopifyShop(row) };
}

/**
 * Disconnect shop: delete webhooks + clear encrypted token.
 * @param {string} userId
 */
export async function disconnectShopify(userId) {
  const shop = await getShopifyShopForUser(userId);
  if (shop?.shop_domain) {
    const token = await getShopifyAccessToken(shop.shop_domain);
    if (token) {
      await removeShopifyWebhooks(shop.shop_domain, token);
    }
  }
  const connection = await disconnectShopifyForUser(userId);
  return { ok: true, status: 200, connection };
}

/**
 * Process an inbound Shopify Admin webhook.
 * @param {Object} params
 * @param {string} params.rawBody
 * @param {Headers} params.headers
 */
export async function processShopifyWebhook({ rawBody, headers }) {
  const shopifyHmac = headers.get('x-shopify-hmac-sha256');
  const shopDomain = normalizeShopDomain(headers.get('x-shopify-shop-domain') || '');
  const topic = String(headers.get('x-shopify-topic') || '').toLowerCase();
  const webhookId = headers.get('x-shopify-webhook-id') || '';

  if (!shopifyHmac || !shopDomain || !topic) {
    return { status: 400, body: { error: 'Missing Shopify webhook headers' } };
  }

  // Prefer raw HMAC in Next.js (Shopify adapter expects Node IncomingMessage).
  let hmacOk = verifyShopifyHmac(rawBody, shopifyHmac);
  if (!hmacOk) {
    try {
      const { getShopify } = await import('@/lib/shopify/config');
      const shopify = getShopify();
      const valid = await shopify.webhooks.validate({
        rawBody,
        rawRequest: {
          headers: Object.fromEntries(headers.entries()),
        },
      });
      hmacOk = Boolean(valid?.valid);
    } catch {
      hmacOk = false;
    }
  }
  if (!hmacOk) {
    logger.warn('Shopify webhook HMAC failed', { shopDomain, topic });
    return { status: 401, body: { error: 'Invalid webhook signature' } };
  }

  const claimed = await claimShopifyWebhookEvent(webhookId, shopDomain, topic);
  if (!claimed) {
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  // Lifecycle / GDPR
  if (topic === 'app/uninstalled' || topic === 'shop/redact') {
    await markShopifyShopDisconnected(shopDomain);
    return { status: 200, body: { ok: true } };
  }

  if (topic === 'customers/data_request' || topic === 'customers/redact') {
    // Acknowledge compliance webhooks — no notification fan-out.
    logger.info('Shopify compliance webhook acknowledged', { shopDomain, topic });
    return { status: 200, body: { ok: true } };
  }

  const shop = await getShopifyShopByDomain(shopDomain);
  if (!shop?.connected || !shop.user_id) {
    logger.warn('Shopify webhook for unknown/disconnected shop', { shopDomain, topic });
    return { status: 200, body: { ok: true, ignored: true } };
  }

  const enabled = Array.isArray(shop.enabled_topics) ? shop.enabled_topics : [];
  if (!isNotifiableTopic(topic) || !enabled.includes(topic)) {
    return { status: 200, body: { ok: true, ignored: true } };
  }

  let payloadBody = {};
  try {
    payloadBody = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'Invalid JSON body' } };
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', shop.user_id)
    .single();

  if (!profile || profile.stripe_subscription_status !== 'active') {
    logger.info('Shopify webhook skipped — inactive subscription', {
      shopDomain,
      userId: shop.user_id,
    });
    return { status: 200, body: { ok: true, skipped: 'subscription' } };
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', shop.user_id)
    .single();

  const channelConfigs = await fetchChannelConfigs(supabase, shop.user_id);
  const payload = mapShopifyWebhookToPayload(topic, payloadBody, shopDomain);

  const { data: event } = await supabase
    .from('webhook_events')
    .insert({
      user_id: shop.user_id,
      webhook_token: profile.webhook_token,
      received_payload: { ...payload, _detected_platform: 'shopify', _shopify_topic: topic },
      processing_status: 'processing',
      detected_platform: 'shopify',
      request_signature_valid: true,
    })
    .select('id')
    .single();

  try {
    const delivery = await notificationService.notify({
      userId: shop.user_id,
      profile,
      settings: settings ?? {},
      channelConfigs,
      payload,
      webhookEventId: event?.id,
    });

    const anySuccess = delivery.some((d) => d.success);
    await supabase
      .from('webhook_events')
      .update({
        processing_status: anySuccess ? 'completed' : 'failed',
        delivery_summary: delivery.map((d) => ({
          channel: d.channel,
          success: d.success,
          error: d.error ?? null,
        })),
        error_message: anySuccess
          ? null
          : delivery.map((d) => d.error).filter(Boolean).join('; ') || 'All channels failed',
      })
      .eq('id', event?.id);

    await touchShopifyWebhook(shopDomain);
    await supabase
      .from('user_settings')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('user_id', shop.user_id);

    return { status: 200, body: { ok: true, eventId: event?.id, delivery } };
  } catch (err) {
    logger.error('Shopify webhook delivery failed', {
      shopDomain,
      topic,
      error: err.message,
    });
    if (event?.id) {
      await supabase
        .from('webhook_events')
        .update({
          processing_status: 'failed',
          error_message: 'Notification delivery error',
        })
        .eq('id', event.id);
    }
    return { status: 500, body: { error: 'Delivery failed' } };
  }
}

/**
 * @param {string} rawBody
 * @param {string} hmacHeader
 */
function verifyShopifyHmac(rawBody, hmacHeader) {
  const { apiSecret } = getShopifyEnv();
  if (!apiSecret || !hmacHeader) return false;
  const digest = crypto.createHmac('sha256', apiSecret).update(rawBody, 'utf8').digest('base64');
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(String(hmacHeader));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
