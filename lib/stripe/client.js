import Stripe from 'stripe';
import { getEnv } from '@/lib/env';

/** @returns {Stripe} */
export function getStripe() {
  return new Stripe(getEnv().stripeSecretKey);
}
