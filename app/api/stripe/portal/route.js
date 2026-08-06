import { NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe/billing';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { logger } from '@/lib/logger';

/** POST — open Stripe Customer Portal (invoices, payment method, plan changes) */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const { user, supabase } = auth;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single();

  const email = profile?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: 'Account email is required for billing' }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const flow =
    body.flow === 'subscription_update' || body.flow === 'payment_method_update'
      ? body.flow
      : null;

  try {
    const url = await createPortalSession({
      email,
      customerId: profile?.stripe_customer_id,
      flow,
    });
    return NextResponse.json({ url });
  } catch (err) {
    logger.error('Stripe portal session failed', { userId: user.id, error: err.message });
    return NextResponse.json(
      { error: err.message || 'Could not open billing portal' },
      { status: 400 }
    );
  }
}
