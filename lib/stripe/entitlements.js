/**
 * Resolve effective billing entitlement for a user (personal or team).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getPlan } from '@/lib/stripe/plans';
import { getWebhookUsage, evaluateUsageLimit } from '@/lib/stripe/usage';

/**
 * @typedef {Object} BillingEntitlement
 * @property {boolean} active
 * @property {string} planId
 * @property {string|null} interval
 * @property {string|null} customerId
 * @property {string|null} subscriptionId
 * @property {string|null} priceId
 * @property {string|null} teamId
 * @property {'personal'|'team'} source
 * @property {string|null} trialEndsAt
 * @property {string|null} currentPeriodEnd
 * @property {boolean} cancelAtPeriodEnd
 * @property {number} seatLimit
 * @property {number|null} webhookLimitMonthly
 */

/**
 * @param {string} userId
 * @returns {Promise<BillingEntitlement>}
 */
export async function resolveBillingEntitlement(userId) {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, email, stripe_subscription_status, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_plan, billing_interval, trial_ends_at, current_period_end, cancel_at_period_end, team_id'
    )
    .eq('id', userId)
    .single();

  // Prefer active team membership billing
  const { data: membership } = await supabase
    .from('billing_team_members')
    .select('team_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  let team = null;
  if (membership?.team_id) {
    const { data: teamRow } = await supabase
      .from('billing_teams')
      .select('*')
      .eq('id', membership.team_id)
      .maybeSingle();
    team = teamRow;
  }

  if (team && team.stripe_subscription_status === 'active') {
    const plan = getPlan(team.billing_plan) || getPlan('pro');
    return {
      active: true,
      planId: team.billing_plan || 'pro',
      interval: team.billing_interval,
      customerId: team.stripe_customer_id,
      subscriptionId: team.stripe_subscription_id,
      priceId: team.stripe_price_id,
      teamId: team.id,
      source: 'team',
      trialEndsAt: team.trial_ends_at,
      currentPeriodEnd: team.current_period_end,
      cancelAtPeriodEnd: Boolean(team.cancel_at_period_end),
      seatLimit: team.seat_limit ?? plan?.seatLimit ?? 1,
      webhookLimitMonthly:
        team.webhook_limit_monthly ?? plan?.webhookLimitMonthly ?? null,
    };
  }

  const personalActive = profile?.stripe_subscription_status === 'active';
  const planId = personalActive ? profile.billing_plan || 'pro' : 'free';
  const plan = getPlan(planId);

  return {
    active: Boolean(personalActive),
    planId,
    interval: profile?.billing_interval || null,
    customerId: profile?.stripe_customer_id || null,
    subscriptionId: profile?.stripe_subscription_id || null,
    priceId: profile?.stripe_price_id || null,
    teamId: null,
    source: 'personal',
    trialEndsAt: profile?.trial_ends_at || null,
    currentPeriodEnd: profile?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(profile?.cancel_at_period_end),
    seatLimit: plan?.seatLimit ?? 1,
    webhookLimitMonthly: plan?.webhookLimitMonthly ?? null,
  };
}

/**
 * @param {string} userId
 */
export async function getBillingDashboardState(userId) {
  const entitlement = await resolveBillingEntitlement(userId);
  const usage = await getWebhookUsage(userId);
  const limitEval = evaluateUsageLimit({
    planId: entitlement.planId,
    webhookCount: usage.webhookCount,
  });

  return {
    entitlement,
    usage: {
      ...usage,
      limit: limitEval.limit ?? entitlement.webhookLimitMonthly,
      remaining: limitEval.remaining,
      overage: limitEval.overage,
      limited: limitEval.limited,
      allowed: limitEval.allowed,
    },
  };
}
