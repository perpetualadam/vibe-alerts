/**
 * Register / sync Shopify Admin webhooks for a shop install.
 */

import { getShopifyEnv } from '@/lib/shopify/config';
import { resolveTopicsToRegister } from '@/lib/shopify/topics';
import { logger } from '@/lib/logger';

/**
 * @param {string} shopDomain
 * @param {string} accessToken
 * @param {string} path - e.g. /admin/api/2025-07/webhooks.json
 * @param {object} [init]
 */
async function shopifyAdminFetch(shopDomain, accessToken, path, init = {}) {
  const { apiVersion } = getShopifyEnv();
  const version =
    typeof apiVersion === 'string' ? apiVersion : String(apiVersion || '2025-07');
  const url = `https://${shopDomain}/admin/api/${version}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

/**
 * List existing webhooks for the shop.
 * @param {string} shopDomain
 * @param {string} accessToken
 */
export async function listShopifyWebhooks(shopDomain, accessToken) {
  const result = await shopifyAdminFetch(
    shopDomain,
    accessToken,
    '/webhooks.json'
  );
  if (!result.ok) {
    throw new Error(result.data?.errors || `Failed to list webhooks (HTTP ${result.status})`);
  }
  return Array.isArray(result.data.webhooks) ? result.data.webhooks : [];
}

/**
 * Ensure webhooks for selected + required topics are registered.
 * @param {Object} params
 * @param {string} params.shopDomain
 * @param {string} params.accessToken
 * @param {string[]} params.enabledTopics - merchant selectable topics
 * @returns {Promise<Record<string, number>>} topic → webhook id
 */
export async function syncShopifyWebhooks({
  shopDomain,
  accessToken,
  enabledTopics,
}) {
  const { appUrl } = getShopifyEnv();
  const address = `${appUrl}/api/shopify/webhooks`;
  const desired = resolveTopicsToRegister(enabledTopics);

  const existing = await listShopifyWebhooks(shopDomain, accessToken);
  /** @type {Record<string, { id: number, address: string }>} */
  const byTopic = {};
  for (const hook of existing) {
    if (hook?.topic) {
      byTopic[String(hook.topic)] = {
        id: Number(hook.id),
        address: String(hook.address || ''),
      };
    }
  }

  /** @type {Record<string, number>} */
  const webhookIds = {};

  for (const topic of desired) {
    const current = byTopic[topic];
    if (current && current.address === address) {
      webhookIds[topic] = current.id;
      continue;
    }

    // Address mismatch — delete stale then recreate
    if (current?.id) {
      await shopifyAdminFetch(
        shopDomain,
        accessToken,
        `/webhooks/${current.id}.json`,
        { method: 'DELETE' }
      );
    }

    const created = await shopifyAdminFetch(
      shopDomain,
      accessToken,
      '/webhooks.json',
      {
        method: 'POST',
        body: JSON.stringify({
          webhook: {
            topic,
            address,
            format: 'json',
          },
        }),
      }
    );

    if (!created.ok) {
      logger.error('Failed to register Shopify webhook', {
        shopDomain,
        topic,
        status: created.status,
        error: created.data?.errors || created.data,
      });
      throw new Error(
        `Failed to subscribe to ${topic}: ${JSON.stringify(created.data?.errors || created.status)}`
      );
    }

    const id = created.data?.webhook?.id;
    if (id) webhookIds[topic] = Number(id);
  }

  // Remove VibeAlerts-managed hooks that are no longer desired
  for (const [topic, meta] of Object.entries(byTopic)) {
    if (desired.includes(topic)) continue;
    if (meta.address !== address) continue;
    await shopifyAdminFetch(
      shopDomain,
      accessToken,
      `/webhooks/${meta.id}.json`,
      { method: 'DELETE' }
    );
  }

  return webhookIds;
}

/**
 * Best-effort delete all VibeAlerts webhooks for a shop.
 * @param {string} shopDomain
 * @param {string} accessToken
 */
export async function removeShopifyWebhooks(shopDomain, accessToken) {
  const { appUrl } = getShopifyEnv();
  const address = `${appUrl}/api/shopify/webhooks`;
  try {
    const existing = await listShopifyWebhooks(shopDomain, accessToken);
    for (const hook of existing) {
      if (String(hook.address || '') !== address) continue;
      await shopifyAdminFetch(
        shopDomain,
        accessToken,
        `/webhooks/${hook.id}.json`,
        { method: 'DELETE' }
      );
    }
  } catch (err) {
    logger.warn('Failed to remove Shopify webhooks on disconnect', {
      shopDomain,
      error: err.message,
    });
  }
}
