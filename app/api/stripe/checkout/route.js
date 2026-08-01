import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/billing';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { logger } from '@/lib/logger';

/** POST — create Stripe Checkout session for subscription */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const { user, supabase } = auth;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_subscription_status')
    .eq('id', user.id)
    .single();

  const email = profile?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: 'Account email is required for billing' }, { status: 400 });
  }

  if (profile?.stripe_subscription_status === 'active') {
    return NextResponse.json({ error: 'Subscription is already active' }, { status: 409 });
  }

  try {
    const url = await createCheckoutSession({ userId: user.id, email });
    return NextResponse.json({ url });
  } catch (err) {
    if (err.message === 'STRIPE_PRICE_ID is not configured') {
      return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 });
    }
    logger.error('Stripe checkout session failed', { userId: user.id, error: err.message });
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
