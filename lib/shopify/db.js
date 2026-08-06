/**
 * Persistence for Shopify App installs (encrypted access tokens).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  decryptCredential,
  encryptCredential,
  isCredentialEncryptionReady,
} from '@/lib/security/credentials';
import { DEFAULT_ENABLED_TOPICS } from '@/lib/shopify/topics';

/**
 * @typedef {Object} ShopifyShopPublic
 * @property {boolean} connected
 * @property {string|null} shopDomain
 * @property {string[]} enabledTopics
 * @property {string|null} installedAt
 * @property {string|null} lastWebhookAt
 * @property {string|null} scope
 */

/**
 * @param {Record<string, unknown>|null} row
 * @returns {ShopifyShopPublic}
 */
export function toPublicShopifyShop(row) {
  if (!row || !row.connected) {
    return {
      connected: false,
      shopDomain: null,
      enabledTopics: DEFAULT_ENABLED_TOPICS,
      installedAt: null,
      lastWebhookAt: null,
      scope: null,
    };
  }

  return {
    connected: true,
    shopDomain: row.shop_domain ? String(row.shop_domain) : null,
    enabledTopics: Array.isArray(row.enabled_topics)
      ? row.enabled_topics.map(String)
      : DEFAULT_ENABLED_TOPICS,
    installedAt: row.installed_at ? String(row.installed_at) : null,
    lastWebhookAt: row.last_webhook_at ? String(row.last_webhook_at) : null,
    scope: row.scope ? String(row.scope) : null,
  };
}

/**
 * @param {string} userId
 */
export async function getShopifyShopForUser(userId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('shopify_shops')
    .select(
      'user_id, shop_domain, connected, enabled_topics, installed_at, last_webhook_at, scope, webhook_ids'
    )
    .eq('user_id', userId)
    .eq('connected', true)
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @param {string} shopDomain
 */
export async function getShopifyShopByDomain(shopDomain) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('shopify_shops')
    .select('*')
    .eq('shop_domain', shopDomain)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @param {string} shopDomain
 */
export async function getShopifyAccessToken(shopDomain) {
  const row = await getShopifyShopByDomain(shopDomain);
  if (!row?.connected || !row.access_token_encrypted) return null;
  return decryptCredential(row.access_token_encrypted);
}

/**
 * Upsert a shop install after OAuth.
 * @param {Object} params
 */
export async function upsertShopifyShop({
  userId,
  shopDomain,
  accessToken,
  scope,
  enabledTopics = DEFAULT_ENABLED_TOPICS,
}) {
  if (!isCredentialEncryptionReady()) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY is required to store Shopify access tokens');
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const row = {
    user_id: userId,
    shop_domain: shopDomain,
    access_token_encrypted: encryptCredential(accessToken),
    scope: scope || null,
    connected: true,
    enabled_topics: enabledTopics,
    installed_at: now,
    uninstalled_at: null,
  };

  const { data, error } = await supabase
    .from('shopify_shops')
    .upsert(row, { onConflict: 'shop_domain' })
    .select(
      'user_id, shop_domain, connected, enabled_topics, installed_at, last_webhook_at, scope, webhook_ids'
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} shopDomain
 * @param {string[]} enabledTopics
 * @param {Record<string, number|string>} webhookIds
 */
export async function updateShopifyTopicsAndWebhooks(
  shopDomain,
  enabledTopics,
  webhookIds
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('shopify_shops')
    .update({
      enabled_topics: enabledTopics,
      webhook_ids: webhookIds,
    })
    .eq('shop_domain', shopDomain)
    .select(
      'user_id, shop_domain, connected, enabled_topics, installed_at, last_webhook_at, scope, webhook_ids'
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft-disconnect / uninstall cleanup.
 * @param {string} shopDomain
 */
export async function markShopifyShopDisconnected(shopDomain) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (!isCredentialEncryptionReady()) {
    const { error } = await supabase
      .from('shopify_shops')
      .update({
        connected: false,
        uninstalled_at: now,
        webhook_ids: {},
      })
      .eq('shop_domain', shopDomain);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('shopify_shops')
    .update({
      connected: false,
      uninstalled_at: now,
      access_token_encrypted: encryptCredential(`revoked:${shopDomain}:${now}`),
      webhook_ids: {},
    })
    .eq('shop_domain', shopDomain);

  if (error) throw error;
}

/**
 * @param {string} userId
 */
export async function disconnectShopifyForUser(userId) {
  const shop = await getShopifyShopForUser(userId);
  if (!shop?.shop_domain) return toPublicShopifyShop(null);
  await markShopifyShopDisconnected(shop.shop_domain);
  return toPublicShopifyShop(null);
}

/**
 * @param {string} shopDomain
 */
export async function touchShopifyWebhook(shopDomain) {
  const supabase = createAdminClient();
  await supabase
    .from('shopify_shops')
    .update({ last_webhook_at: new Date().toISOString() })
    .eq('shop_domain', shopDomain);
}

/**
 * @param {string} webhookId
 * @param {string} shopDomain
 * @param {string} topic
 * @returns {Promise<boolean>} true if newly inserted
 */
export async function claimShopifyWebhookEvent(webhookId, shopDomain, topic) {
  if (!webhookId) return true;
  const supabase = createAdminClient();
  const { error } = await supabase.from('shopify_webhook_events').insert({
    id: webhookId,
    shop_domain: shopDomain,
    topic,
  });
  if (error?.code === '23505') return false;
  if (error) throw error;
  return true;
}
