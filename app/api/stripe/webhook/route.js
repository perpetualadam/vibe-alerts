import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/client';
import { syncSubscriptionRecord } from '@/lib/stripe/billing';
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
        const teamId = session.metadata?.team_id || null;
        let subscription = null;
        if (session.subscription) {
          subscription = await getStripe().subscriptions.retrieve(String(session.subscription));
        }
        await syncSubscriptionRecord({
          userId,
          email,
          teamId,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          subscription,
          status: 'active',
        });
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const userId = resolveCheckoutUserId(session);
        const email = session.customer_details?.email || session.customer_email;
        await syncSubscriptionRecord({
          userId,
          email,
          teamId: session.metadata?.team_id || null,
          customerId: typeof session.customer === 'string' ? session.customer : null,
          subscription: null,
          status: 'inactive',
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const email = resolveInvoiceEmail(invoice);
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        let subscription = null;
        if (invoice.subscription) {
          subscription = await getStripe().subscriptions.retrieve(String(invoice.subscription));
        }
        await syncSubscriptionRecord({
          userId: subscription?.metadata?.user_id || null,
          email,
          teamId: subscription?.metadata?.team_id || null,
          customerId,
          subscription,
          status: 'active',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const email = resolveInvoiceEmail(invoice);
        await syncSubscriptionRecord({
          userId: null,
          email,
          customerId: typeof invoice.customer === 'string' ? invoice.customer : null,
          subscription: null,
          status: 'inactive',
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = mapStripeSubscriptionStatus(subscription.status);
        const customer = await getStripe().customers.retrieve(subscription.customer);
        const email = !customer.deleted ? customer.email : null;
        await syncSubscriptionRecord({
          userId: subscription.metadata?.user_id || null,
          email,
          teamId: subscription.metadata?.team_id || null,
          customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
          subscription,
          status,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await getStripe().customers.retrieve(subscription.customer);
        const email = !customer.deleted ? customer.email : null;
        await syncSubscriptionRecord({
          userId: subscription.metadata?.user_id || null,
          email,
          teamId: subscription.metadata?.team_id || null,
          customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
          subscription,
          status: 'inactive',
        });
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
