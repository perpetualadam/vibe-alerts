import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getLegalContext } from '@/lib/legal/site';

export const metadata = buildPageMetadata({
  title: 'Pricing',
  description:
    'VibeAlerts subscription pricing for website form to Telegram and multi-channel alert delivery.',
  path: '/pricing',
});

export default function PricingPage() {
  const { siteName, priceLabel, supportEmail, trialLabel } = getLegalContext();

  const included = [
    'Unlimited webhook endpoints per account (one URL per tenant)',
    'Telegram, Email, Slack, Microsoft Teams, and WhatsApp notifications',
    'Platform connectors for WordPress, Wix, Webflow, Shopify, Squarespace, Typeform, and Google Forms',
    'Dashboard for API keys, channel settings, and delivery history',
    'API key and HMAC webhook authentication with rate limiting',
  ];

  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Simple subscription pricing</h1>
          <p className="text-vibe-muted text-lg">
            {siteName} is a software subscription. One plan includes every notification channel and platform
            integration.
          </p>
        </div>

        <article className="glass rounded-2xl p-8 space-y-6 border border-vibe-border">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wider text-vibe-accent font-medium">VibeAlerts Pro</p>
            {trialLabel ? (
              <>
                <p className="text-4xl font-bold">{trialLabel}</p>
                <p className="text-lg text-vibe-muted">Then {priceLabel}</p>
              </>
            ) : (
              <p className="text-4xl font-bold">{priceLabel}</p>
            )}
            <p className="text-sm text-vibe-muted">
              {trialLabel
                ? 'Card required at signup. Cancel before the trial ends to avoid the first charge.'
                : 'Billed monthly. Cancel anytime from your dashboard.'}
            </p>
          </div>
          <ul className="space-y-2 text-sm text-vibe-muted">
            {included.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/login" className="btn-primary px-6 py-3">
              Create account{trialLabel ? ' & start trial' : ''}
            </Link>
            <Link href="/refunds" className="btn-secondary px-6 py-3">
              Refund &amp; cancellation policy
            </Link>
          </div>
        </article>

        <div className="text-sm text-vibe-muted space-y-2">
          <p>
            Questions about billing? Email{' '}
            <a href={`mailto:${supportEmail}`} className="text-vibe-accent hover:underline">
              {supportEmail}
            </a>{' '}
            or visit our <Link href="/contact">contact page</Link>.
          </p>
          <p>
            Promotional pricing, if offered, will always show the discounted price at checkout and in your Stripe
            receipt. Standard terms apply unless stated otherwise on the promotion.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
