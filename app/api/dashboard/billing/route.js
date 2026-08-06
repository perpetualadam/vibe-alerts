import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getPublicPlanCatalog } from '@/lib/stripe/plans';
import { getSubscriptionTrialDays, getSubscriptionTrialLabel } from '@/lib/stripe/trial';
import { getBillingDashboardState } from '@/lib/stripe/entitlements';
import { getTeamForUser } from '@/lib/stripe/teams';
import { listCustomerInvoices } from '@/lib/stripe/billing';

export const runtime = 'nodejs';

/** GET billing dashboard state: plan, usage, team, recent invoices */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const [state, teamState] = await Promise.all([
      getBillingDashboardState(auth.user.id),
      getTeamForUser(auth.user.id),
    ]);

    let invoices = [];
    if (state.entitlement.customerId) {
      try {
        invoices = await listCustomerInvoices(state.entitlement.customerId, { limit: 8 });
      } catch {
        invoices = [];
      }
    }

    return NextResponse.json({
      ...state,
      plans: getPublicPlanCatalog(),
      trialDays: getSubscriptionTrialDays(),
      trialLabel: getSubscriptionTrialLabel(),
      team: teamState.team
        ? {
            id: teamState.team.id,
            name: teamState.team.name,
            plan: teamState.team.billing_plan,
            status: teamState.team.stripe_subscription_status,
            seatLimit: teamState.team.seat_limit,
            role: teamState.role,
            members: teamState.members,
          }
        : null,
      invoices,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load billing' }, { status: 500 });
  }
}
