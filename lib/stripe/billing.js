/**
 * Stripe Checkout, Customer Portal, plan changes, invoices, promo codes.
 */

import { getEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe/client';
import { getSubscriptionTrialDays } from '@/lib/stripe/trial';
import {
  findPlanByPriceId,
  normalizeInterval,
  resolvePlanPriceId,
} from '@/lib/stripe/plans';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/** @deprecated use resolvePlanPriceId — kept for older callers */
export function getStripePriceId() {
  return resolvePlanPriceId('pro', 'month') || process.env.STRIPE_PRICE_ID?.trim() || null;
}

/** @param {string} email */
export async function findStripeCustomerByEmail(email) {
  const customers = await getStripe().customers.list({ email, limit: 1 });
  return customers.data[0] ?? null;
}

/**
 * Prefer stored customer id; create/link by email when missing.
 * @param {{ userId: string, email: string, customerId?: string|null }} params
 */
export async function getOrCreateStripeCustomer({ userId, email, customerId }) {
  const stripe = getStripe();
  const supabase = createAdminClient();

  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if (existing && !existing.deleted) return existing;
    } catch {
      // recreate below
    }
  }

  const byEmail = await findStripeCustomerByEmail(email);
  if (byEmail) {
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: byEmail.id })
      .eq('id', userId);
    return byEmail;
  }

  const created = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: created.id })
    .eq('id', userId);

  return created;
}

/**
 * Look up an active promotion code string (e.g. LAUNCH20).
 * @param {string} code
 */
export async function resolvePromotionCode(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) return null;

  const list = await getStripe().promotionCodes.list({
    code: trimmed,
    active: true,
    limit: 1,
  });
  return list.data[0] ?? null;
}

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @param {string} [params.planId]
 * @param {string} [params.interval]
 * @param {string} [params.promoCode]
 * @param {string} [params.teamId]
 * @param {string} [params.customerId]
 */
export async function createCheckoutSession({
  userId,
  email,
  planId = 'pro',
  interval = 'month',
  promoCode,
  teamId = null,
  customerId = null,
}) {
  const normalizedInterval = normalizeInterval(interval);
  const priceId = resolvePlanPriceId(planId, normalizedInterval);
  if (!priceId) {
    throw new Error(`Price not configured for plan=${planId} interval=${normalizedInterval}`);
  }

  const { appUrl } = getEnv();
  const trialDays = getSubscriptionTrialDays();
  const customer = await getOrCreateStripeCustomer({
    userId,
    email,
    customerId,
  });

  /** @type {import('stripe').Stripe.Checkout.SessionCreateParams} */
  const params = {
    mode: 'subscription',
    customer: customer.id,
    client_reference_id: userId,
    metadata: {
      user_id: userId,
      plan_id: planId,
      billing_interval: normalizedInterval,
      ...(teamId ? { team_id: teamId } : {}),
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        plan_id: planId,
        billing_interval: normalizedInterval,
        ...(teamId ? { team_id: teamId } : {}),
      },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?billing=success`,
    cancel_url: `${appUrl}/dashboard/billing?billing=cancelled`,
  };

  if (promoCode) {
    const promo = await resolvePromotionCode(promoCode);
    if (!promo) {
      throw new Error('Invalid or expired promo code');
    }
    params.discounts = [{ promotion_code: promo.id }];
  } else {
    params.allow_promotion_codes = true;
  }

  const session = await getStripe().checkout.sessions.create(params);
  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }
  return session.url;
}

/**
 * @param {{ email: string, customerId?: string|null, flow?: 'subscription_update'|'payment_method_update'|null }} params
 */
export async function createPortalSession({ email, customerId = null, flow = null }) {
  const stripe = getStripe();
  let customer = null;

  if (customerId) {
    try {
      customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) customer = null;
    } catch {
      customer = null;
    }
  }

  if (!customer) {
    customer = await findStripeCustomerByEmail(email);
  }

  if (!customer) {
    throw new Error('No Stripe customer found for this account');
  }

  const { appUrl } = getEnv();

  /** @type {import('stripe').Stripe.BillingPortal.SessionCreateParams} */
  const params = {
    customer: customer.id,
    return_url: `${appUrl}/dashboard/billing`,
  };

  if (flow === 'subscription_update') {
    params.flow_data = {
      type: 'subscription_update',
    };
  } else if (flow === 'payment_method_update') {
    params.flow_data = {
      type: 'payment_method_update',
    };
  }

  const session = await stripe.billingPortal.sessions.create(params);
  return session.url;
}

/**
 * Upgrade / downgrade the active subscription to another plan price (proration).
 * @param {Object} params
 */
export async function changeSubscriptionPlan({
  subscriptionId,
  planId,
  interval,
  userId,
}) {
  const stripe = getStripe();
  const normalizedInterval = normalizeInterval(interval);
  const priceId = resolvePlanPriceId(planId, normalizedInterval);
  if (!priceId) {
    throw new Error(`Price not configured for plan=${planId} interval=${normalizedInterval}`);
  }
  if (!subscriptionId) {
    throw new Error('No active subscription to change');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error('Subscription has no line items');
  }

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'create_prorations',
    metadata: {
      ...(subscription.metadata || {}),
      user_id: userId,
      plan_id: planId,
      billing_interval: normalizedInterval,
    },
  });

  return updated;
}

/**
 * @param {string} customerId
 * @param {{ limit?: number }} [options]
 */
export async function listCustomerInvoices(customerId, options = {}) {
  if (!customerId) return [];
  const invoices = await getStripe().invoices.list({
    customer: customerId,
    limit: options.limit ?? 24,
  });

  return invoices.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    currency: inv.currency,
    total: inv.total,
    amountPaid: inv.amount_paid,
    amountDue: inv.amount_due,
    created: inv.created,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    invoicePdf: inv.invoice_pdf,
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
  }));
}

/**
 * Persist subscription fields on profile and optional team after Stripe events.
 * @param {Object} params
 */
export async function syncSubscriptionRecord({
  userId,
  email,
  teamId,
  customerId,
  subscription,
  status,
}) {
  const supabase = createAdminClient();
  const priceId = subscription?.items?.data?.[0]?.price?.id || null;
  const matched = findPlanByPriceId(priceId);
  const planId = matched?.planId || subscription?.metadata?.plan_id || 'pro';
  const interval =
    matched?.interval ||
    subscription?.metadata?.billing_interval ||
    subscription?.items?.data?.[0]?.price?.recurring?.interval ||
    null;

  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const profilePatch = {
    stripe_subscription_status: status,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    ...(subscription?.id ? { stripe_subscription_id: subscription.id } : {}),
    ...(priceId ? { stripe_price_id: priceId } : {}),
    billing_plan: status === 'active' ? planId : 'free',
    billing_interval: interval,
    trial_ends_at: trialEnd,
    current_period_end: periodEnd,
    cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
  };

  let query = supabase.from('profiles').update(profilePatch);
  if (userId) query = query.eq('id', userId);
  else if (email) query = query.eq('email', email);
  else throw new Error('Cannot sync subscription without user id or email');

  const { error } = await query;
  if (error) throw error;

  const resolvedTeamId = teamId || subscription?.metadata?.team_id || null;
  if (resolvedTeamId && status) {
    const { getPlan } = await import('@/lib/stripe/plans');
    const planDef = getPlan(planId);
    /** @type {Record<string, unknown>} */
    const teamPatch = {
      stripe_subscription_status: status,
      billing_plan: status === 'active' ? planId : 'free',
      billing_interval: interval,
      trial_ends_at: trialEnd,
      current_period_end: periodEnd,
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    };
    if (customerId) teamPatch.stripe_customer_id = customerId;
    if (subscription?.id) teamPatch.stripe_subscription_id = subscription.id;
    if (priceId) teamPatch.stripe_price_id = priceId;
    if (planDef?.seatLimit) teamPatch.seat_limit = planDef.seatLimit;
    if (planDef?.webhookLimitMonthly != null) {
      teamPatch.webhook_limit_monthly = planDef.webhookLimitMonthly;
    }
    await supabase.from('billing_teams').update(teamPatch).eq('id', resolvedTeamId);
  }

  logger.info('Subscription record synced', { userId, email, status, planId, interval });
}
