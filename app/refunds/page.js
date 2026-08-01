import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import LegalDocument from '@/components/marketing/LegalDocument';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getLegalContext } from '@/lib/legal/site';

export const metadata = buildPageMetadata({
  title: 'Refunds & Cancellations',
  description:
    'VibeAlerts refund, dispute, and subscription cancellation policy for digital software subscriptions.',
  path: '/refunds',
});

export default function RefundsPage() {
  const ctx = getLegalContext();

  return (
    <MarketingShell>
      <LegalDocument title="Refunds &amp; Cancellations" lastUpdated={ctx.lastUpdated}>
        <p>
          {ctx.siteName} sells digital software subscriptions only. We do not sell or ship physical goods. This policy
          explains refunds, billing disputes, and how to cancel.
        </p>

        <section>
          <h2>1. Digital service — no returns</h2>
          <p>
            Because {ctx.siteName} is a hosted software service delivered electronically, there are no physical
            products to return. Access is provided immediately after successful payment and account activation.
          </p>
        </section>

        <section>
          <h2>2. Refund policy</h2>
          <ul>
            <li>
              <strong>First subscription payment:</strong> If the service does not work as described and our support
              team cannot resolve the issue within 7 days of your first payment, you may request a full refund of that
              first payment by emailing{' '}
              <a href={`mailto:${ctx.supportEmail}`}>{ctx.supportEmail}</a> within 14 days of purchase.
            </li>
            <li>
              <strong>Renewals:</strong> Subscription renewals are generally non-refundable. If you were charged after
              canceling, contact us within 7 days and we will review the charge.
            </li>
            <li>
              Refunds, when approved, are returned to the original payment method via Stripe and may take 5–10 business
              days to appear.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Cancellation policy</h2>
          <ul>
            <li>
              You may cancel anytime from your dashboard by clicking <strong>Manage billing</strong>, which opens the
              Stripe Customer Portal.
            </li>
            <li>
              When you cancel, your subscription remains active until the end of the current billing period. You will
              not be charged again unless you resubscribe.
            </li>
            <li>
              After the billing period ends, webhook requests may receive HTTP 402 Payment Required until you subscribe
              again.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Disputes and chargebacks</h2>
          <p>
            If you have a billing problem, please contact{' '}
            <a href={`mailto:${ctx.supportEmail}`}>{ctx.supportEmail}</a> before opening a payment dispute or
            chargeback with your bank. We will work in good faith to resolve legitimate issues quickly.
          </p>
          <p>
            Unauthorized or fraudulent chargebacks may result in account suspension while the dispute is investigated.
          </p>
        </section>

        <section>
          <h2>5. Promotional offers</h2>
          <p>
            From time to time we may offer discounted or extended trial pricing. Promotional terms (duration, eligibility,
            and whether the offer converts to standard {ctx.priceLabel} pricing) will be shown at checkout and on the
            promotion landing page. Unless stated otherwise, standard refund and cancellation rules apply after any
            promotional period ends.
          </p>
        </section>

        <section>
          <h2>6. Export and legal restrictions</h2>
          <p>
            {ctx.siteName} is offered globally where permitted by law. You are responsible for ensuring your use complies
            with local regulations. We may restrict access where required by sanctions, export controls, or legal
            obligations.
          </p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            Billing support: <a href={`mailto:${ctx.supportEmail}`}>{ctx.supportEmail}</a> ·{' '}
            <Link href={ctx.contactUrl}>Contact page</Link> ·{' '}
            <Link href={ctx.pricingUrl}>Pricing</Link>
          </p>
        </section>
      </LegalDocument>
    </MarketingShell>
  );
}
