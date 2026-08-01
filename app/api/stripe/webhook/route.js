import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/client';
import {
  mapStripeSubscriptionStatus,
  resolveCheckoutUserId,
  resolveInvoiceEmail,
} from '@/lib/stripe/status';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * Stripe webhook handler.
 * Configure in Stripe Dashboard → Webhooks → endpoint: /api/stripe/webhook
 */
export async function POST(request) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

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

  const { error: idempotencyError } = await supabase.from('stripe_webhook_events').insert({
    id: event.id,
    event_type: event.type,
  });

  if (idempotencyError?.code === '23505') {
    logger.debug('Duplicate Stripe event ignored', { eventId: event.id });
    return Response.json({ received: true, duplicate: true });
  }

  if (idempotencyError) {
    logger.error('Stripe idempotency insert failed', { error: idempotencyError.message });
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = resolveCheckoutUserId(session);
        const email = session.customer_details?.email || session.customer_email;
        await setSubscriptionStatus(supabase, { userId, email }, 'active');
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const userId = resolveCheckoutUserId(session);
        const email = session.customer_details?.email || session.customer_email;
        await setSubscriptionStatus(supabase, { userId, email }, 'inactive');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const email = resolveInvoiceEmail(invoice);
        if (email) await setSubscriptionStatus(supabase, { email }, 'active');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const email = resolveInvoiceEmail(invoice);
        if (email) await setSubscriptionStatus(supabase, { email }, 'inactive');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = mapStripeSubscriptionStatus(subscription.status);
        const customer = await getStripe().customers.retrieve(subscription.customer);
        const email = customer.email;
        if (email) await setSubscriptionStatus(supabase, { email }, status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await getStripe().customers.retrieve(subscription.customer);
        const email = customer.email;
        if (email) await setSubscriptionStatus(supabase, { email }, 'inactive');
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

async function setSubscriptionStatus(supabase, { userId, email }, status) {
  let query = supabase.from('profiles').update({ stripe_subscription_status: status });

  if (userId) {
    query = query.eq('id', userId);
  } else if (email) {
    query = query.eq('email', email);
  } else {
    throw new Error('Cannot update subscription status without user id or email');
  }

  const { error } = await query;

  if (error) {
    logger.error('Failed to update subscription status', { userId, email, status, error: error.message });
    throw error;
  }

  logger.info('Subscription status updated', { userId, email, status });
}
