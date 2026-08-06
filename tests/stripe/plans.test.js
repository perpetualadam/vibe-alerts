import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BILLING_PLANS,
  findPlanByPriceId,
  getPublicPlanCatalog,
  normalizeInterval,
  resolvePlanPriceId,
} from '@/lib/stripe/plans';
import { evaluateUsageLimit } from '@/lib/stripe/usage';

describe('billing plans', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_m';
    process.env.STRIPE_PRICE_STARTER_YEARLY = 'price_starter_y';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_m';
    process.env.STRIPE_PRICE_PRO_YEARLY = 'price_pro_y';
    process.env.STRIPE_PRICE_ID = 'price_legacy';
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('exposes starter and pro with monthly/yearly variants', () => {
    expect(BILLING_PLANS.map((p) => p.id)).toEqual(['starter', 'pro']);
    const catalog = getPublicPlanCatalog();
    expect(catalog[0].prices.month.configured).toBe(true);
    expect(catalog[1].prices.year.configured).toBe(true);
  });

  it('resolves and reverse-maps price ids', () => {
    expect(resolvePlanPriceId('starter', 'year')).toBe('price_starter_y');
    expect(findPlanByPriceId('price_pro_m')).toEqual({ planId: 'pro', interval: 'month' });
    expect(normalizeInterval('annual')).toBe('year');
  });

  it('falls back to STRIPE_PRICE_ID for pro monthly', () => {
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    expect(resolvePlanPriceId('pro', 'month')).toBe('price_legacy');
  });

  it('enforces hard webhook limits on starter and allows pro overage', () => {
    const starter = evaluateUsageLimit({ planId: 'starter', webhookCount: 1000 });
    expect(starter.allowed).toBe(false);
    const pro = evaluateUsageLimit({ planId: 'pro', webhookCount: 30_000 });
    expect(pro.allowed).toBe(true);
    expect(pro.overage).toBe(5_000);
  });
});
