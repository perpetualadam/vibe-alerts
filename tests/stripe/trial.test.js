import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSubscriptionTrialDays, getSubscriptionTrialLabel } from '@/lib/stripe/trial';

describe('subscription trial config', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  beforeEach(() => {
    delete process.env.STRIPE_TRIAL_PERIOD_DAYS;
    delete process.env.NEXT_PUBLIC_SUBSCRIPTION_TRIAL_DAYS;
  });

  it('defaults to 14 days', () => {
    expect(getSubscriptionTrialDays()).toBe(14);
    expect(getSubscriptionTrialLabel()).toBe('14-day free trial');
  });

  it('reads STRIPE_TRIAL_PERIOD_DAYS', () => {
    process.env.STRIPE_TRIAL_PERIOD_DAYS = '7';
    expect(getSubscriptionTrialDays()).toBe(7);
    expect(getSubscriptionTrialLabel()).toBe('7-day free trial');
  });

  it('returns 0 and null label when disabled', () => {
    process.env.STRIPE_TRIAL_PERIOD_DAYS = '0';
    expect(getSubscriptionTrialDays()).toBe(0);
    expect(getSubscriptionTrialLabel()).toBeNull();
  });
});
