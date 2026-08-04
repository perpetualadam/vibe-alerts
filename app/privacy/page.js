import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import LegalDocument from '@/components/marketing/LegalDocument';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getLegalContext } from '@/lib/legal/site';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description: 'How VibeAlerts collects, uses, and protects personal data.',
  path: '/privacy',
});

export default function PrivacyPage() {
  const ctx = getLegalContext();

  return (
    <MarketingShell>
      <LegalDocument title="Privacy Policy" lastUpdated={ctx.lastUpdated}>
        <p>
          {ctx.legalName} (&quot;{ctx.siteName}&quot;) respects your privacy. This policy explains what data we
          collect when you use {ctx.siteUrl} and how we use it.
        </p>

        <section>
          <h2>1. Data we collect</h2>
          <ul>
            <li>
              <strong>Account data:</strong> email address and authentication information (via Supabase Auth).
            </li>
            <li>
              <strong>Configuration data:</strong> webhook tokens, channel settings (e.g. Telegram chat ID), and
              integration preferences stored in our database.
            </li>
            <li>
              <strong>Webhook payloads:</strong> form submission data sent to your webhook URL, processed to deliver
              notifications and logged for delivery history.
            </li>
            <li>
              <strong>Billing data:</strong> subscription status and payment metadata processed by Stripe (we do not
              store full card numbers).
            </li>
            <li>
              <strong>Usage data:</strong> server logs, IP addresses, and optional analytics (Google Analytics) on
              public marketing pages.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. How we use data</h2>
          <ul>
            <li>Provide and secure the {ctx.siteName} service.</li>
            <li>Deliver notifications to channels you configure.</li>
            <li>Process subscriptions and prevent fraud.</li>
            <li>Respond to support requests.</li>
            <li>Improve reliability and monitor abuse (rate limiting, security headers).</li>
          </ul>
        </section>

        <section>
          <h2>3. Third-party processors</h2>
          <p>We use trusted providers including:</p>
          <ul>
            <li>Supabase (authentication and database hosting)</li>
            <li>Stripe (payments and subscription management)</li>
            <li>Vercel (application hosting)</li>
            <li>Telegram, Resend, Slack, Discord, Microsoft Teams, or Meta (when you enable those channels)</li>
            <li>Google Analytics (optional, on public pages only when configured)</li>
          </ul>
          <p>Each processor handles data according to their own privacy policies.</p>
        </section>

        <section>
          <h2>4. Data retention</h2>
          <p>
            We retain account and webhook event data while your account is active and for a reasonable period
            afterward for legal, security, and billing purposes. You may request deletion by contacting support.
          </p>
        </section>

        <section>
          <h2>5. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or export your personal data.
            Contact <a href={`mailto:${ctx.supportEmail}`}>{ctx.supportEmail}</a> to submit a request.
          </p>
        </section>

        <section>
          <h2>6. Cookies</h2>
          <p>
            We use essential cookies for dashboard authentication. Optional analytics cookies may be set when Google
            Analytics is enabled on marketing pages.
          </p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            Privacy questions: <a href={`mailto:${ctx.supportEmail}`}>{ctx.supportEmail}</a> or{' '}
            <Link href={ctx.contactUrl}>contact support</Link>.
          </p>
        </section>
      </LegalDocument>
    </MarketingShell>
  );
}
