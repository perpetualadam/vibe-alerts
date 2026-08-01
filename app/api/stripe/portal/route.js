import { NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe/billing';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { logger } from '@/lib/logger';

/** POST — create Stripe Customer Portal session */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const { user, supabase } = auth;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  const email = profile?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: 'Account email is required for billing' }, { status: 400 });
  }

  try {
    const url = await createPortalSession(email);
    return NextResponse.json({ url });
  } catch (err) {
    if (err.message === 'No Stripe customer found for this account') {
      return NextResponse.json({ error: 'No billing account found. Subscribe first.' }, { status: 404 });
    }
    logger.error('Stripe portal session failed', { userId: user.id, error: err.message });
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}
