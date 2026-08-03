import { getEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe/client';
import { getSubscriptionTrialDays } from '@/lib/stripe/trial';

export function getStripePriceId() {
  return process.env.STRIPE_PRICE_ID?.trim() || null;
}

/** @param {string} email */
export async function findStripeCustomerByEmail(email) {
  const customers = await getStripe().customers.list({ email, limit: 1 });
  return customers.data[0] ?? null;
}

/**
 * @param {{ userId: string, email: string }} params
 * @returns {Promise<string>} Checkout session URL
 */
export async function createCheckoutSession({ userId, email }) {
  const priceId = getStripePriceId();
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is not configured');
  }

  const { appUrl } = getEnv();
  const trialDays = getSubscriptionTrialDays();

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    client_reference_id: userId,
    metadata: { user_id: userId },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/dashboard?billing=cancelled`,
    allow_promotion_codes: true,
    ...(trialDays > 0
      ? { subscription_data: { trial_period_days: trialDays } }
      : {}),
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return session.url;
}

/**
 * @param {string} email
 * @returns {Promise<string>} Customer portal session URL
 */
export async function createPortalSession(email) {
  const customer = await findStripeCustomerByEmail(email);
  if (!customer) {
    throw new Error('No Stripe customer found for this account');
  }

  const { appUrl } = getEnv();
  const session = await getStripe().billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${appUrl}/dashboard`,
  });

  return session.url;
}
