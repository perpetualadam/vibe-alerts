import { describe, it, expect } from 'vitest';
import {
  mapStripeSubscriptionStatus,
  resolveCheckoutUserId,
  resolveInvoiceEmail,
} from '@/lib/stripe/status';

describe('mapStripeSubscriptionStatus', () => {
  it('maps active and trialing to active', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('trialing')).toBe('active');
  });

  it('maps other Stripe statuses to inactive', () => {
    expect(mapStripeSubscriptionStatus('past_due')).toBe('inactive');
    expect(mapStripeSubscriptionStatus('canceled')).toBe('inactive');
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('inactive');
  });
});

describe('resolveCheckoutUserId', () => {
  it('prefers client_reference_id', () => {
    expect(
      resolveCheckoutUserId({
        client_reference_id: 'user-1',
        metadata: { user_id: 'user-2' },
      })
    ).toBe('user-1');
  });

  it('falls back to metadata user_id', () => {
    expect(resolveCheckoutUserId({ metadata: { user_id: 'user-2' } })).toBe('user-2');
  });
});

describe('resolveInvoiceEmail', () => {
  it('returns customer_email when present', () => {
    expect(resolveInvoiceEmail({ customer_email: 'a@example.com' })).toBe('a@example.com');
  });

  it('returns null when email missing', () => {
    expect(resolveInvoiceEmail({})).toBeNull();
  });
});
