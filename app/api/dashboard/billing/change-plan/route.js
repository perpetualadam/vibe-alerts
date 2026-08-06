import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { changeSubscriptionPlan, syncSubscriptionRecord } from '@/lib/stripe/billing';
import { normalizeInterval } from '@/lib/stripe/plans';
import { resolveBillingEntitlement } from '@/lib/stripe/entitlements';
import { mapStripeSubscriptionStatus } from '@/lib/stripe/status';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST — upgrade/downgrade the active subscription (prorated).
 * Body: { plan: 'starter'|'pro', interval: 'month'|'year' }
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const planId = typeof body.plan === 'string' ? body.plan : '';
  const interval = normalizeInterval(body.interval || 'month');
  if (!['starter', 'pro'].includes(planId)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const entitlement = await resolveBillingEntitlement(auth.user.id);
  if (!entitlement.active || !entitlement.subscriptionId) {
    return NextResponse.json(
      { error: 'No active subscription. Start checkout first.' },
      { status: 400 }
    );
  }

  if (entitlement.source === 'team' && entitlement.teamId) {
    // Only personal owner path for in-app change; team owner uses same if they own sub
    const { getTeamForUser } = await import('@/lib/stripe/teams');
    const team = await getTeamForUser(auth.user.id);
    if (team.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the team owner can change the plan' },
        { status: 403 }
      );
    }
  }

  try {
    const updated = await changeSubscriptionPlan({
      subscriptionId: entitlement.subscriptionId,
      planId,
      interval,
      userId: auth.user.id,
    });

    await syncSubscriptionRecord({
      userId: auth.user.id,
      email: auth.user.email,
      teamId: entitlement.teamId,
      customerId: entitlement.customerId,
      subscription: updated,
      status: mapStripeSubscriptionStatus(updated.status),
    });

    return NextResponse.json({
      ok: true,
      planId,
      interval,
      subscriptionId: updated.id,
    });
  } catch (err) {
    logger.error('Plan change failed', { userId: auth.user.id, error: err.message });
    return NextResponse.json(
      { error: err.message || 'Could not change plan' },
      { status: 400 }
    );
  }
}
