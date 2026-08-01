import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

function getStripe() {
  return new Stripe(getEnv().stripeSecretKey);
}

/**
 * Stripe webhook handler.
 * Configure in Stripe Dashboard → Webhooks → endpoint: /api/stripe/webhook
 *
 * Events handled:
 * - checkout.session.completed → active
 * - invoice.payment_succeeded → active
 * - customer.subscription.deleted → inactive
 * - invoice.payment_failed → inactive
 */
export async function POST(request) {
  const { stripeWebhookSecret } = getEnv();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (err) {
    logger.warn('Stripe signature verification failed', { error: err.message });
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;
        if (email) await setSubscriptionStatus(supabase, email, 'active');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const email = invoice.customer_email;
        if (email) await setSubscriptionStatus(supabase, email, 'active');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await getStripe().customers.retrieve(subscription.customer);
        const email = customer.email;
        if (email) await setSubscriptionStatus(supabase, email, 'inactive');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const email = invoice.customer_email;
        if (email) await setSubscriptionStatus(supabase, email, 'inactive');
        break;
      }

      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }
  } catch (err) {
    logger.error('Stripe webhook processing error', { type: event.type, error: err.message });
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return Response.json({ received: true });
}

async function setSubscriptionStatus(supabase, email, status) {
  const { error } = await supabase
    .from('profiles')
    .update({ stripe_subscription_status: status })
    .eq('email', email);

  if (error) {
    logger.error('Failed to update subscription status', { email, status, error: error.message });
    throw error;
  }

  logger.info('Subscription status updated', { email, status });
}
