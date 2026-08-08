import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import AudienceProblems from '@/components/marketing/AudienceProblems';
import { CTA_TRIAL } from '@/lib/marketing/cta';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getLegalContext } from '@/lib/legal/site';
import { getPublicPlanCatalog } from '@/lib/stripe/plans';

export const metadata = buildPageMetadata({
  title: 'Pricing',
  description:
    'VibeAlerts subscription pricing — monthly and annual plans with free trial, usage limits, and team billing.',
  path: '/pricing',
});

export default function PricingPage() {
  const { siteName, supportEmail, trialLabel } = getLegalContext();
  const plans = getPublicPlanCatalog();

  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Simple, flexible pricing</h1>
          <p className="text-vibe-muted text-lg max-w-2xl mx-auto">
            {siteName} offers monthly and annual plans, a free trial, promo codes at checkout, usage
            allowances, invoices, and team billing.
          </p>
          {trialLabel && (
            <p className="text-sm text-vibe-accent font-medium">{trialLabel} on every paid plan</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="glass rounded-2xl p-8 space-y-6 border border-vibe-border"
            >
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-wider text-vibe-accent font-medium">
                  {plan.name}
                </p>
                <p className="text-3xl font-bold">{plan.prices.month.label}</p>
                <p className="text-sm text-vibe-muted">
                  or {plan.prices.year.label} (save vs monthly)
                </p>
                <p className="text-sm text-vibe-muted pt-2">{plan.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-vibe-muted">
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    {plan.webhookLimitMonthly.toLocaleString()} webhooks / month
                    {plan.overageAllowed ? ' + metered overage' : ''}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    {plan.seatLimit} team seat{plan.seatLimit === 1 ? '' : 's'}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>All notification channels & platform connectors</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Customer Portal, invoices, upgrade/downgrade</span>
                </li>
              </ul>
              <Link href="/login" className="btn-primary px-6 py-3 w-full sm:w-auto inline-flex">
                {trialLabel ? CTA_TRIAL : 'Get started'}
              </Link>
            </article>
          ))}
        </div>

        <AudienceProblems compact showSecondary={false} />

        <div className="text-sm text-vibe-muted space-y-2 max-w-3xl mx-auto">
          <p>
            Promo codes are entered at Stripe Checkout. Manage payment methods, invoices, and
            cancellations anytime from the dashboard Customer Portal.
          </p>
          <p>
            Questions? Email{' '}
            <a href={`mailto:${supportEmail}`} className="text-vibe-accent hover:underline">
              {supportEmail}
            </a>{' '}
            or visit our <Link href="/contact">contact page</Link>.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
