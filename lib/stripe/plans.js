/**
 * VibeAlerts billing plan catalog.
 * Monthly/annual Stripe Price IDs come from env (never hardcode live price IDs).
 */

/**
 * @typedef {Object} PlanDef
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} webhookLimitMonthly - 0 = unlimited
 * @property {number} seatLimit
 * @property {boolean} overageAllowed - when true, webhooks continue past limit (metered)
 * @property {{ monthly: number|null, yearly: number|null }} amountCents - display only
 * @property {{ monthly: string|null, yearly: string|null }} priceEnvKeys
 */

/** @type {PlanDef[]} */
export const BILLING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Solo builders — form alerts with a monthly webhook allowance.',
    webhookLimitMonthly: 1_000,
    seatLimit: 1,
    overageAllowed: false,
    amountCents: { monthly: 900, yearly: 9000 },
    priceEnvKeys: {
      monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
      yearly: 'STRIPE_PRICE_STARTER_YEARLY',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Growing teams — higher limits, seats, and usage-based overage.',
    webhookLimitMonthly: 25_000,
    seatLimit: 10,
    overageAllowed: true,
    amountCents: { monthly: 1500, yearly: 15000 },
    priceEnvKeys: {
      monthly: 'STRIPE_PRICE_PRO_MONTHLY',
      yearly: 'STRIPE_PRICE_PRO_YEARLY',
    },
  },
];

/**
 * Resolve Stripe price id for a plan + interval.
 * Falls back to STRIPE_PRICE_ID for pro/monthly (legacy).
 * @param {string} planId
 * @param {'month'|'year'} interval
 */
export function resolvePlanPriceId(planId, interval) {
  const plan = BILLING_PLANS.find((p) => p.id === planId);
  if (!plan) return null;

  const key = interval === 'year' ? plan.priceEnvKeys.yearly : plan.priceEnvKeys.monthly;
  const fromEnv = key ? process.env[key]?.trim() : '';
  if (fromEnv) return fromEnv;

  // Legacy single-price fallback → Pro monthly
  if (planId === 'pro' && interval === 'month') {
    return process.env.STRIPE_PRICE_ID?.trim() || null;
  }

  return null;
}

/**
 * @param {string} priceId
 * @returns {{ planId: string, interval: 'month'|'year' }|null}
 */
export function findPlanByPriceId(priceId) {
  if (!priceId) return null;
  for (const plan of BILLING_PLANS) {
    for (const interval of /** @type {const} */ (['month', 'year'])) {
      const id = resolvePlanPriceId(plan.id, interval);
      if (id && id === priceId) {
        return { planId: plan.id, interval };
      }
    }
  }
  // Legacy price → pro monthly
  if (priceId === process.env.STRIPE_PRICE_ID?.trim()) {
    return { planId: 'pro', interval: 'month' };
  }
  return null;
}

/**
 * @param {string} planId
 */
export function getPlan(planId) {
  return BILLING_PLANS.find((p) => p.id === planId) || null;
}

/**
 * Public catalog for pricing / billing UI (no secrets).
 */
export function getPublicPlanCatalog() {
  return BILLING_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    webhookLimitMonthly: plan.webhookLimitMonthly,
    seatLimit: plan.seatLimit,
    overageAllowed: plan.overageAllowed,
    prices: {
      month: {
        amountCents: plan.amountCents.monthly,
        configured: Boolean(resolvePlanPriceId(plan.id, 'month')),
        label: formatMoney(plan.amountCents.monthly) + '/month',
      },
      year: {
        amountCents: plan.amountCents.yearly,
        configured: Boolean(resolvePlanPriceId(plan.id, 'year')),
        label: formatMoney(plan.amountCents.yearly) + '/year',
      },
    },
  }));
}

/**
 * @param {number|null} cents
 */
function formatMoney(cents) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * @param {string} interval
 * @returns {'month'|'year'}
 */
export function normalizeInterval(interval) {
  return interval === 'year' || interval === 'yearly' || interval === 'annual'
    ? 'year'
    : 'month';
}
