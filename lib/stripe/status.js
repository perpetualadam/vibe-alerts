/** Map Stripe subscription status to VibeAlerts billing flag. */
export function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return 'active';
  }
  return 'inactive';
}

/** @param {import('stripe').Stripe.Checkout.Session} session */
export function resolveCheckoutUserId(session) {
  return session.client_reference_id || session.metadata?.user_id || null;
}

/** @param {import('stripe').Stripe.Invoice} invoice */
export function resolveInvoiceEmail(invoice) {
  return invoice.customer_email || null;
}
