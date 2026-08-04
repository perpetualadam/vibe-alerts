import { SITE, absoluteUrl, getSiteUrl } from '@/lib/seo/site';
import { getSubscriptionTrialDays, getSubscriptionTrialLabel } from '@/lib/stripe/trial';

/** Customer support email shown on public legal/compliance pages. */
export function getSupportEmail() {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@vibe-alerts.com';
}

/** Subscription price label for public pricing/legal pages. */
export function getSubscriptionPriceLabel() {
  return process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_LABEL?.trim() || '$15/month';
}

export const LEGAL = {
  lastUpdated: '2026-08-03',
  serviceDescription:
    'VibeAlerts is a hosted software subscription that forwards website form submissions to notification channels such as Telegram, Email, Slack, Discord, Microsoft Teams, and WhatsApp.',
  governingLaw: 'England and Wales',
};

/** Public routes Stripe reviewers and customers should find easily. */
export const COMPLIANCE_PAGES = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refunds', label: 'Refunds & Cancellations' },
];

export function getLegalContext() {
  const trialDays = getSubscriptionTrialDays();
  const trialLabel = getSubscriptionTrialLabel();

  return {
    siteName: SITE.name,
    legalName: SITE.legalName,
    siteUrl: getSiteUrl(),
    supportEmail: getSupportEmail(),
    priceLabel: getSubscriptionPriceLabel(),
    trialDays,
    trialLabel,
    serviceDescription: LEGAL.serviceDescription,
    lastUpdated: LEGAL.lastUpdated,
    governingLaw: LEGAL.governingLaw,
    contactUrl: absoluteUrl('/contact'),
    pricingUrl: absoluteUrl('/pricing'),
    termsUrl: absoluteUrl('/terms'),
    privacyUrl: absoluteUrl('/privacy'),
    refundsUrl: absoluteUrl('/refunds'),
  };
}
