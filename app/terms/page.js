import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import LegalDocument from '@/components/marketing/LegalDocument';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getLegalContext } from '@/lib/legal/site';

export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description: 'VibeAlerts Terms of Service for the form-to-alert webhook subscription service.',
  path: '/terms',
});

export default function TermsPage() {
  const ctx = getLegalContext();

  return (
    <MarketingShell>
      <LegalDocument title="Terms of Service" lastUpdated={ctx.lastUpdated}>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of {ctx.siteName} ({ctx.siteUrl}), operated by{' '}
          {ctx.legalName} (&quot;we&quot;, &quot;us&quot;). By creating an account or paying for a subscription, you
          agree to these Terms.
        </p>

        <section>
          <h2>1. Service description</h2>
          <p>{ctx.serviceDescription}</p>
          <p>
            An active subscription (including any free trial) is required for webhook processing. Without an active
            subscription, incoming webhook requests may receive HTTP 402 Payment Required.
          </p>
        </section>

        <section>
          <h2>2. Accounts</h2>
          <ul>
            <li>You must provide accurate account information, including a valid email address.</li>
            <li>You are responsible for safeguarding your dashboard credentials and webhook API keys.</li>
            <li>You must not share webhook URLs or API keys publicly or use the service for unlawful content.</li>
          </ul>
        </section>

        <section>
          <h2>3. Subscriptions and billing</h2>
          <p>
            Subscriptions are billed in advance on a recurring basis at the price shown on our{' '}
            <Link href={ctx.pricingUrl}>pricing page</Link> ({ctx.priceLabel}) unless a different promotional price is
            clearly displayed at checkout.
          </p>
          {ctx.trialLabel ? (
            <p>
              New subscriptions include a {ctx.trialLabel.toLowerCase()} with full access. A valid payment method is
              required at signup. If you do not cancel before the trial ends, you authorize the first recurring charge at
              the standard price shown at checkout.
            </p>
          ) : null}
          <p>
            Payments are processed by Stripe. By subscribing, you authorize recurring charges until you cancel. See our{' '}
            <Link href={ctx.refundsUrl}>Refunds &amp; Cancellations</Link> policy for cancellation and refund rules.
          </p>
        </section>

        <section>
          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Send spam, malware, or illegal content through webhooks or notifications.</li>
            <li>Attempt to bypass rate limits, authentication, or tenant isolation.</li>
            <li>Resell or sublicense the service without written permission.</li>
            <li>Use the service in violation of Telegram, Stripe, or other third-party platform policies.</li>
          </ul>
        </section>

        <section>
          <h2>5. Third-party services</h2>
          <p>
            {ctx.siteName} integrates with third parties including Supabase (auth/database), Stripe (billing), Telegram,
            and optional notification providers. Your use of those services is subject to their respective terms.
          </p>
        </section>

        <section>
          <h2>6. Availability and changes</h2>
          <p>
            We strive for high availability but do not guarantee uninterrupted service. We may modify features or
            pricing with reasonable notice. Material price changes apply to subsequent billing periods.
          </p>
        </section>

        <section>
          <h2>7. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, {ctx.legalName} is not liable for indirect, incidental, or
            consequential damages, including lost leads or revenue from missed notifications. Our total liability for
            any claim is limited to the amount you paid in the twelve months before the claim.
          </p>
        </section>

        <section>
          <h2>8. Governing law</h2>
          <p>
            These Terms are governed by the laws of {ctx.governingLaw}, without regard to conflict-of-law principles.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>
            Questions about these Terms:{' '}
            <a href={`mailto:${ctx.supportEmail}`}>{ctx.supportEmail}</a> or{' '}
            <Link href={ctx.contactUrl}>contact support</Link>.
          </p>
        </section>
      </LegalDocument>
    </MarketingShell>
  );
}
