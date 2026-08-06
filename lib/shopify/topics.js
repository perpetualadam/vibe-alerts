/**
 * Merchant-selectable Shopify webhook topics and payload mappers.
 */

/**
 * @typedef {Object} ShopifyTopicDef
 * @property {string} id - Shopify webhook topic (e.g. orders/create)
 * @property {string} label
 * @property {string} description
 * @property {string} group
 * @property {boolean} [required] - GDPR / lifecycle topics always registered
 * @property {boolean} [selectable] - shown in merchant UI
 */

/** @type {ShopifyTopicDef[]} */
export const SHOPIFY_TOPICS = [
  {
    id: 'orders/create',
    label: 'New orders',
    description: 'Notify when a new order is created',
    group: 'Orders',
    selectable: true,
  },
  {
    id: 'orders/paid',
    label: 'Paid orders',
    description: 'Notify when an order is paid',
    group: 'Orders',
    selectable: true,
  },
  {
    id: 'orders/cancelled',
    label: 'Cancelled orders',
    description: 'Notify when an order is cancelled',
    group: 'Orders',
    selectable: true,
  },
  {
    id: 'orders/fulfilled',
    label: 'Fulfilled orders',
    description: 'Notify when an order is fulfilled',
    group: 'Orders',
    selectable: true,
  },
  {
    id: 'customers/create',
    label: 'New customers',
    description: 'Notify when a customer is created',
    group: 'Customers',
    selectable: true,
  },
  {
    id: 'refunds/create',
    label: 'Refunds',
    description: 'Notify when a refund is created',
    group: 'Refunds',
    selectable: true,
  },
  {
    id: 'checkouts/create',
    label: 'Checkouts started',
    description: 'Notify when a checkout is created (cart started)',
    group: 'Abandoned carts',
    selectable: true,
  },
  {
    id: 'checkouts/update',
    label: 'Checkout updates / abandoned carts',
    description: 'Notify on checkout updates — useful for abandoned cart workflows',
    group: 'Abandoned carts',
    selectable: true,
  },
  // Mandatory compliance topics (always registered, not merchant-toggleable)
  {
    id: 'app/uninstalled',
    label: 'App uninstalled',
    description: 'Clean up when the merchant uninstalls the app',
    group: 'Lifecycle',
    required: true,
    selectable: false,
  },
  {
    id: 'customers/data_request',
    label: 'Customer data request',
    description: 'GDPR customers/data_request',
    group: 'Compliance',
    required: true,
    selectable: false,
  },
  {
    id: 'customers/redact',
    label: 'Customer redact',
    description: 'GDPR customers/redact',
    group: 'Compliance',
    required: true,
    selectable: false,
  },
  {
    id: 'shop/redact',
    label: 'Shop redact',
    description: 'GDPR shop/redact',
    group: 'Compliance',
    required: true,
    selectable: false,
  },
];

export const SELECTABLE_SHOPIFY_TOPICS = SHOPIFY_TOPICS.filter((t) => t.selectable);
export const REQUIRED_SHOPIFY_TOPICS = SHOPIFY_TOPICS.filter((t) => t.required).map((t) => t.id);

export const DEFAULT_ENABLED_TOPICS = [
  'orders/create',
  'orders/paid',
  'customers/create',
  'refunds/create',
];

/**
 * @param {string[]} selected
 */
export function resolveTopicsToRegister(selected) {
  const selectableIds = new Set(SELECTABLE_SHOPIFY_TOPICS.map((t) => t.id));
  const chosen = (selected ?? []).filter((id) => selectableIds.has(id));
  return Array.from(new Set([...chosen, ...REQUIRED_SHOPIFY_TOPICS]));
}

/**
 * Map a Shopify Admin webhook payload into a flat notification payload.
 * @param {string} topic
 * @param {Record<string, unknown>} body
 * @param {string} shopDomain
 * @returns {Record<string, string>}
 */
export function mapShopifyWebhookToPayload(topic, body, shopDomain) {
  /** @type {Record<string, string>} */
  const out = {
    source: 'shopify',
    shop: shopDomain,
    event: topic,
  };

  if (!body || typeof body !== 'object') return out;

  if (topic.startsWith('orders/')) {
    if (body.name != null) out.order_name = String(body.name);
    if (body.id != null) out.order_id = String(body.id);
    if (body.email) out.email = String(body.email);
    if (body.total_price != null) out.total = String(body.total_price);
    if (body.currency) out.currency = String(body.currency);
    if (body.financial_status) out.financial_status = String(body.financial_status);
    if (body.fulfillment_status) {
      out.fulfillment_status = String(body.fulfillment_status);
    }
    const customer = /** @type {Record<string, unknown>|undefined} */ (body.customer);
    if (customer?.first_name || customer?.last_name) {
      out.customer_name = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .map(String)
        .join(' ');
    }
    if (Array.isArray(body.line_items) && body.line_items.length) {
      out.items = body.line_items
        .slice(0, 5)
        .map((item) => {
          const li = /** @type {Record<string, unknown>} */ (item);
          return `${li.quantity || 1}× ${li.title || li.name || 'item'}`;
        })
        .join(', ');
    }
    return out;
  }

  if (topic.startsWith('customers/')) {
    if (body.id != null) out.customer_id = String(body.id);
    if (body.email) out.email = String(body.email);
    if (body.first_name || body.last_name) {
      out.customer_name = [body.first_name, body.last_name]
        .filter(Boolean)
        .map(String)
        .join(' ');
    }
    if (body.phone) out.phone = String(body.phone);
    if (body.orders_count != null) out.orders_count = String(body.orders_count);
    return out;
  }

  if (topic.startsWith('refunds/')) {
    if (body.id != null) out.refund_id = String(body.id);
    if (body.order_id != null) out.order_id = String(body.order_id);
    if (body.note) out.note = String(body.note);
    if (Array.isArray(body.transactions) && body.transactions[0]) {
      const tx = /** @type {Record<string, unknown>} */ (body.transactions[0]);
      if (tx.amount != null) out.amount = String(tx.amount);
      if (tx.currency) out.currency = String(tx.currency);
    }
    return out;
  }

  if (topic.startsWith('checkouts/') || topic.startsWith('carts/')) {
    if (body.id != null) out.checkout_id = String(body.id);
    if (body.token) out.checkout_token = String(body.token);
    if (body.email) out.email = String(body.email);
    if (body.abandoned_checkout_url) {
      out.abandoned_checkout_url = String(body.abandoned_checkout_url);
    }
    if (body.total_price != null) out.total = String(body.total_price);
    if (body.currency) out.currency = String(body.currency);
    if (body.completed_at) out.completed_at = String(body.completed_at);
    return out;
  }

  // Generic fallback — keep a few top-level scalars
  for (const [key, value] of Object.entries(body)) {
    if (value == null || typeof value === 'object') continue;
    if (out[key]) continue;
    out[key] = String(value).slice(0, 500);
    if (Object.keys(out).length > 20) break;
  }
  return out;
}

/**
 * Whether this topic should trigger merchant notifications.
 * @param {string} topic
 */
export function isNotifiableTopic(topic) {
  return SELECTABLE_SHOPIFY_TOPICS.some((t) => t.id === topic);
}
