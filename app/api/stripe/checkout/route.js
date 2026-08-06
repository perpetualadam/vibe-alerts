import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/billing';
import { normalizeInterval } from '@/lib/stripe/plans';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { logger } from '@/lib/logger';

/** POST — create Stripe Checkout session for subscription */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const { user, supabase } = auth;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_subscription_status, stripe_customer_id')
    .eq('id', user.id)
    .single();

  const email = profile?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: 'Account email is required for billing' }, { status: 400 });
  }

  if (profile?.stripe_subscription_status === 'active') {
    return NextResponse.json(
      { error: 'Subscription is already active. Use Change plan or the Customer Portal.' },
      { status: 409 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const planId = typeof body.plan === 'string' ? body.plan : 'pro';
  const interval = normalizeInterval(body.interval || 'month');
  const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';
  const teamId = typeof body.teamId === 'string' ? body.teamId : null;

  try {
    const url = await createCheckoutSession({
      userId: user.id,
      email,
      planId,
      interval,
      promoCode: promoCode || undefined,
      teamId,
      customerId: profile?.stripe_customer_id,
    });
    return NextResponse.json({ url });
  } catch (err) {
    if (/Price not configured|STRIPE_PRICE/i.test(err.message)) {
      return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 });
    }
    if (/promo code/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logger.error('Stripe checkout session failed', { userId: user.id, error: err.message });
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
