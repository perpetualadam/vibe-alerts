import Link from 'next/link';
import JsonLd from '@/components/marketing/JsonLd';
import MarketingShell from '@/components/marketing/MarketingShell';
import TrustBadges from '@/components/marketing/TrustBadges';
import AudienceProblems from '@/components/marketing/AudienceProblems';
import { buildHomePageSchemas, getMarketingFaqs, getHowToSteps } from '@/lib/seo/jsonld';
import { SITE } from '@/lib/seo/site';
import { getSubscriptionPriceLabel } from '@/lib/legal/site';
import { getSubscriptionTrialLabel } from '@/lib/stripe/trial';

const features = [
  {
    icon: '🌐',
    title: 'Any website platform',
    description:
      'WordPress, Wix, Webflow, Shopify, Squarespace, Typeform, Google Forms, or custom HTML — one webhook URL for all.',
  },
  {
    icon: '⚡',
    title: 'Instant mobile alerts',
    description:
      'Leads land in Telegram in seconds. Also route to Email, Slack, Microsoft Teams, or WhatsApp.',
  },
  {
    icon: '☁️',
    title: 'Fully hosted — no code',
    description:
      'Paste a connector snippet or webhook URL. No servers, plugins to maintain, or backend development.',
  },
  {
    icon: '🔒',
    title: 'Secure by default',
    description:
      'API keys, rate limits, payload validation, and isolated tenant data protect every incoming form.',
  },
];

const platforms = [
  'WordPress',
  'Wix',
  'Webflow',
  'Shopify',
  'Squarespace',
  'Typeform',
  'Google Forms',
  'Custom HTML',
];

export default function HomePage() {
  const faqs = getMarketingFaqs();
  const howTo = getHowToSteps();
  const priceLabel = getSubscriptionPriceLabel();
  const trialLabel = getSubscriptionTrialLabel();

  return (
    <>
      <JsonLd data={buildHomePageSchemas()} />

      <MarketingShell>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16" aria-labelledby="hero-heading">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left space-y-6">
              <p className="inline-flex items-center gap-2 text-vibe-accent text-sm font-medium tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                Form-to-alert automation
              </p>
              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1]"
              >
                Never miss a website lead again
              </h1>
              <p className="text-vibe-muted text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                {SITE.description}
              </p>
              <p className="text-sm text-vibe-muted">
                {trialLabel ? (
                  <>
                    <span className="text-emerald-300 font-medium">{trialLabel}</span>, then {priceLabel}.{' '}
                  </>
                ) : (
                  <>Plans from {priceLabel}. </>
                )}
                <Link href="/pricing" className="text-vibe-accent hover:underline">
                  See what&apos;s included
                </Link>
              </p>
              <TrustBadges className="justify-center lg:justify-start !gap-2" />
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-1">
                <Link href="/login" className="btn-primary px-6 py-3 text-base">
                  {trialLabel ? 'Start your free trial' : 'Create free account'}
                </Link>
                <a href="#who-its-for" className="btn-secondary px-6 py-3 text-base">
                  Who it&apos;s for
                </a>
              </div>
            </div>

            {/* Hero visual — example alert flow */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
              <div className="glass-strong rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-vibe-muted uppercase tracking-wider">
                  <span>Live preview</span>
                  <span className="text-emerald-400">● Delivered</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-black/40 border border-vibe-border p-4 text-left">
                    <p className="text-xs text-vibe-muted mb-2">Website form submitted</p>
                    <p className="text-sm font-medium">Name: Jane Doe</p>
                    <p className="text-sm text-vibe-muted">Message: I&apos;d like a quote please</p>
                  </div>
                  <div className="flex justify-center text-vibe-muted text-lg">↓</div>
                  <div className="rounded-xl bg-vibe-accent/10 border border-vibe-accent/30 p-4 text-left">
                    <p className="text-xs text-vibe-accent mb-2 font-medium">Telegram · 2s ago</p>
                    <p className="text-sm font-semibold">🔔 New Lead — Website Form</p>
                    <p className="text-sm text-vibe-muted mt-1">Jane Doe · quote request</p>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 -inset-4 bg-vibe-accent/10 blur-3xl rounded-full opacity-60" />
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="border-y border-vibe-border/60 bg-black/20" aria-label="Supported platforms">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <p className="text-center text-xs uppercase tracking-widest text-vibe-muted mb-4">
              Works with the tools you already use
            </p>
            <ul className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {platforms.map((name) => (
                <li
                  key={name}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-vibe-border text-sm text-vibe-muted"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <AudienceProblems />

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="features-heading">
          <div className="text-center space-y-3 mb-12">
            <h2 id="features-heading" className="section-heading">
              Why small businesses choose VibeAlerts
            </h2>
            <p className="section-lead">
              Set up in minutes. Get notified the moment someone fills out your contact form — wherever you are.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((feature) => (
              <article key={feature.title} className="glass rounded-2xl p-6 space-y-3 hover:border-vibe-accent/30 transition-colors">
                <span className="text-2xl" aria-hidden="true">{feature.icon}</span>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-vibe-muted leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-vibe-border"
          aria-labelledby="howto-heading"
        >
          <div className="text-center space-y-3 mb-12">
            <h2 id="howto-heading" className="section-heading">
              {howTo.name}
            </h2>
            <p className="section-lead">{howTo.description}</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {howTo.steps.map((step, index) => (
              <li key={step.name} className="glass rounded-2xl p-6 space-y-3 relative">
                <span className="inline-flex w-9 h-9 rounded-full bg-vibe-accent text-white items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-lg">{step.name}</h3>
                <p className="text-sm text-vibe-muted leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-vibe-border"
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading" className="section-heading mb-10">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="glass rounded-xl p-5 group open:border-vibe-accent/30 transition-colors">
                <summary className="font-medium cursor-pointer list-none flex justify-between items-start gap-4">
                  <span>{faq.question}</span>
                  <span className="text-vibe-muted group-open:rotate-180 transition-transform shrink-0 mt-0.5" aria-hidden="true">▾</span>
                </summary>
                <p className="text-sm text-vibe-muted mt-3 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="glass-strong rounded-3xl p-8 sm:p-12 text-center space-y-5 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to get every lead on your phone?
            </h2>
            <p className="text-vibe-muted leading-relaxed">
              {trialLabel
                ? `Create an account, start your ${trialLabel.toLowerCase()}, and connect your first form in under five minutes.`
                : 'Create an account, subscribe from your dashboard, and connect your first form in minutes.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/login" className="btn-primary px-8 py-3 text-base">
                {trialLabel ? 'Start free trial' : 'Create your account'}
              </Link>
              <Link href="/pricing" className="btn-secondary px-8 py-3 text-base">
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </MarketingShell>
    </>
  );
}
