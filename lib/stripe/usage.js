/**
 * Monthly webhook usage tracking for plan limits / metering.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getPlan } from '@/lib/stripe/plans';
import { logger } from '@/lib/logger';

export function currentPeriodYm(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * @param {string} userId
 * @param {string|null} [teamId]
 */
export async function incrementWebhookUsage(userId, teamId = null) {
  const supabase = createAdminClient();
  const period = currentPeriodYm();

  const { data: existing } = await supabase
    .from('billing_usage_monthly')
    .select('id, webhook_count')
    .eq('user_id', userId)
    .eq('period_ym', period)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from('billing_usage_monthly')
      .update({
        webhook_count: (existing.webhook_count || 0) + 1,
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('webhook_count')
      .single();
    if (error) throw error;
    return { periodYm: period, webhookCount: data.webhook_count };
  }

  const { data, error } = await supabase
    .from('billing_usage_monthly')
    .insert({
      user_id: userId,
      team_id: teamId,
      period_ym: period,
      webhook_count: 1,
    })
    .select('webhook_count')
    .single();

  if (error) {
    // Race: unique violation — retry once
    if (error.code === '23505') {
      return incrementWebhookUsage(userId, teamId);
    }
    throw error;
  }

  return { periodYm: period, webhookCount: data.webhook_count };
}

/**
 * @param {string} userId
 */
export async function getWebhookUsage(userId) {
  const supabase = createAdminClient();
  const period = currentPeriodYm();
  const { data } = await supabase
    .from('billing_usage_monthly')
    .select('webhook_count, period_ym, overage_reported')
    .eq('user_id', userId)
    .eq('period_ym', period)
    .maybeSingle();

  return {
    periodYm: period,
    webhookCount: data?.webhook_count ?? 0,
    overageReported: data?.overage_reported ?? 0,
  };
}

/**
 * @param {Object} params
 * @param {string} params.planId
 * @param {number} params.webhookCount
 */
export function evaluateUsageLimit({ planId, webhookCount }) {
  const plan = getPlan(planId);
  if (!plan || !plan.webhookLimitMonthly) {
    return {
      allowed: true,
      limited: false,
      remaining: null,
      overage: 0,
      limit: plan?.webhookLimitMonthly ?? null,
    };
  }

  const limit = plan.webhookLimitMonthly;
  const overage = Math.max(0, webhookCount - limit);
  const remaining = Math.max(0, limit - webhookCount);

  if (webhookCount < limit) {
    return { allowed: true, limited: false, remaining, overage: 0, limit };
  }

  if (plan.overageAllowed) {
    return { allowed: true, limited: true, remaining: 0, overage, limit };
  }

  return {
    allowed: false,
    limited: true,
    remaining: 0,
    overage,
    limit,
  };
}

/**
 * Optionally report overage units to Stripe Billing Meter (simple pay-as-you-go).
 * Requires STRIPE_METER_EVENT_NAME + customer id. Best-effort.
 * @param {Object} params
 */
export async function reportOverageToStripe({
  customerId,
  userId,
  webhookCount,
  limit,
  previouslyReported,
}) {
  const eventName = process.env.STRIPE_METER_EVENT_NAME?.trim();
  if (!eventName || !customerId || !limit) return { reported: 0 };

  const overage = Math.max(0, webhookCount - limit);
  const delta = overage - (previouslyReported || 0);
  if (delta <= 0) return { reported: 0 };

  try {
    const { getStripe } = await import('@/lib/stripe/client');
    await getStripe().billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: customerId,
        value: String(delta),
      },
    });

    const supabase = createAdminClient();
    const period = currentPeriodYm();
    await supabase
      .from('billing_usage_monthly')
      .update({ overage_reported: overage })
      .eq('user_id', userId)
      .eq('period_ym', period);

    return { reported: delta };
  } catch (err) {
    logger.warn('Stripe meter overage report failed', { error: err.message, userId });
    return { reported: 0 };
  }
}
