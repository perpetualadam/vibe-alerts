import Link from 'next/link';
import JsonLd from '@/components/marketing/JsonLd';
import MarketingShell from '@/components/marketing/MarketingShell';
import { buildHomePageSchemas, getMarketingFaqs, getHowToSteps } from '@/lib/seo/jsonld';
import { SITE } from '@/lib/seo/site';
import { getSubscriptionPriceLabel } from '@/lib/legal/site';

const features = [
  {
    title: 'Any website platform',
    description:
      'WordPress, Wix, Webflow, Shopify, Squarespace, Typeform, Google Forms, or custom HTML — one webhook URL for all.',
  },
  {
    title: 'Instant Telegram alerts',
    description:
      'Form submissions arrive on your phone in seconds. Also supports Email, Slack, Teams, and WhatsApp.',
  },
  {
    title: 'No server to manage',
    description:
      'Fully hosted SaaS. Paste a connector script or webhook URL — no backend code or infrastructure required.',
  },
  {
    title: 'Secure by default',
    description:
      'API key auth, rate limiting, payload validation, and per-tenant data isolation protect every webhook.',
  },
];

export default function HomePage() {
  const faqs = getMarketingFaqs();
  const howTo = getHowToSteps();
  const priceLabel = getSubscriptionPriceLabel();

  return (
    <>
      <JsonLd data={buildHomePageSchemas()} />

      <MarketingShell>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6" aria-labelledby="hero-heading">
          <p className="text-vibe-accent text-sm font-medium tracking-widest uppercase">
            Form-to-alert automation
          </p>
          <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            Send website form submissions to Telegram instantly
          </h1>
          <p className="text-vibe-muted text-lg max-w-2xl mx-auto">{SITE.description}</p>
          <p className="text-sm text-vibe-muted">
            Subscription from {priceLabel}.{' '}
            <Link href="/pricing" className="text-vibe-accent hover:underline">
              View pricing
            </Link>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors"
            >
              Get started
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors"
            >
              How it works
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-bold text-center mb-10">
            Why teams choose VibeAlerts
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <article key={feature.title} className="glass rounded-xl p-6 space-y-2">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-vibe-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works — AEO answer target */}
        <section
          id="how-it-works"
          className="max-w-5xl mx-auto px-6 py-16 border-t border-vibe-border"
          aria-labelledby="howto-heading"
        >
          <h2 id="howto-heading" className="text-2xl font-bold text-center mb-3">
            {howTo.name}
          </h2>
          <p className="text-vibe-muted text-center max-w-2xl mx-auto mb-10">{howTo.description}</p>
          <ol className="space-y-6 max-w-2xl mx-auto">
            {howTo.steps.map((step, index) => (
              <li key={step.name} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-vibe-accent/20 text-vibe-accent flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.name}</h3>
                  <p className="text-sm text-vibe-muted mt-1">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ — AEO answer snippets */}
        <section
          id="faq"
          className="max-w-5xl mx-auto px-6 py-16 border-t border-vibe-border"
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading" className="text-2xl font-bold text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="glass rounded-xl p-5 group">
                <summary className="font-medium cursor-pointer list-none flex justify-between items-center">
                  {faq.question}
                  <span className="text-vibe-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="text-sm text-vibe-muted mt-3 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to get form alerts on Telegram?</h2>
          <p className="text-vibe-muted mb-6">
            Create an account, subscribe from your dashboard, and connect your first form in minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors"
          >
            Create your account
          </Link>
        </section>
      </MarketingShell>
    </>
  );
}
