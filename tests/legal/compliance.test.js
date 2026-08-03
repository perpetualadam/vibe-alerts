import { describe, it, expect, beforeEach } from 'vitest';
import { buildSitemapEntries } from '@/lib/seo/metadata';
import { buildLlmsTxt } from '@/lib/seo/llms';
import { COMPLIANCE_PAGES, getLegalContext, getSupportEmail } from '@/lib/legal/site';

describe('Stripe business website compliance', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://vibe-alerts.com';
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'support@vibe-alerts.com';
    process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_LABEL = '$15/month';
  });

  it('exposes customer support contact email', () => {
    expect(getSupportEmail()).toBe('support@vibe-alerts.com');
    const ctx = getLegalContext();
    expect(ctx.supportEmail).toContain('@');
    expect(ctx.contactUrl).toBe('https://vibe-alerts.com/contact');
    expect(ctx.trialLabel).toBe('14-day free trial');
  });

  it('lists required public policy pages', () => {
    const hrefs = COMPLIANCE_PAGES.map((page) => page.href);
    expect(hrefs).toContain('/pricing');
    expect(hrefs).toContain('/contact');
    expect(hrefs).toContain('/terms');
    expect(hrefs).toContain('/privacy');
    expect(hrefs).toContain('/refunds');
  });

  it('includes legal pages in sitemap for public access', () => {
    const urls = buildSitemapEntries().map((entry) => entry.url);
    for (const page of COMPLIANCE_PAGES) {
      expect(urls).toContain(`https://vibe-alerts.com${page.href}`);
    }
  });

  it('documents pricing and policies in llms.txt for crawlers', () => {
    const llms = buildLlmsTxt();
    expect(llms).toContain('/pricing');
    expect(llms).toContain('/contact');
    expect(llms).toContain('/terms');
    expect(llms).toContain('/privacy');
    expect(llms).toContain('/refunds');
    expect(llms).toContain('support@vibe-alerts.com');
  });
});
