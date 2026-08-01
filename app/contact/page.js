import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getLegalContext } from '@/lib/legal/site';

export const metadata = buildPageMetadata({
  title: 'Contact',
  description: 'Contact VibeAlerts customer support for billing, technical, and account questions.',
  path: '/contact',
});

export default function ContactPage() {
  const { siteName, supportEmail, pricingUrl, refundsUrl } = getLegalContext();

  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Contact customer support</h1>
          <p className="text-vibe-muted text-lg leading-relaxed">
            {siteName} provides email support for account, billing, and technical questions. We aim to respond within
            one business day (Monday–Friday, UK time).
          </p>
        </div>

        <article className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Email support</h2>
          <p className="text-sm text-vibe-muted">
            For the fastest help, email us from the address on your {siteName} account:
          </p>
          <p>
            <a
              href={`mailto:${supportEmail}`}
              className="text-vibe-accent text-lg font-medium hover:underline"
            >
              {supportEmail}
            </a>
          </p>
        </article>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <article className="glass rounded-xl p-5 space-y-2">
            <h2 className="font-semibold">Billing &amp; subscriptions</h2>
            <p className="text-vibe-muted">
              Subscribe or manage billing from your{' '}
              <Link href="/dashboard" className="text-vibe-accent hover:underline">
                dashboard
              </Link>
              . See <Link href={pricingUrl}>pricing</Link> and our{' '}
              <Link href={refundsUrl}>refund &amp; cancellation policy</Link>.
            </p>
          </article>
          <article className="glass rounded-xl p-5 space-y-2">
            <h2 className="font-semibold">Technical &amp; webhook issues</h2>
            <p className="text-vibe-muted">
              Include your account email, platform (WordPress, Wix, etc.), and any error messages from the dashboard
              activity feed.
            </p>
          </article>
        </div>

        <p className="text-sm text-vibe-muted">
          {siteName} is a digital software service. We do not sell physical goods and do not operate a phone support
          line at this time.
        </p>
      </section>
    </MarketingShell>
  );
}
