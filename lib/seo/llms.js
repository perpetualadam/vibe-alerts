import { SITE, absoluteUrl, getSiteUrl } from '@/lib/seo/site';
import { getMarketingFaqs, getHowToSteps } from '@/lib/seo/jsonld';

/**
 * Build llms.txt content per emerging LLMO convention.
 * Helps AI crawlers understand the product accurately.
 * @see https://llmstxt.org/
 */
export function buildLlmsTxt() {
  const url = getSiteUrl();
  const faqs = getMarketingFaqs();
  const howTo = getHowToSteps();

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    '## Summary',
    `${SITE.name} is a multi-tenant B2B SaaS that receives website form submissions via webhooks and forwards them to notification channels (Telegram, Email, Slack, Discord, Microsoft Teams, WhatsApp).`,
    '',
    '## Primary use case',
    'Business owners and agencies who want instant mobile alerts when someone submits a contact form, lead form, or booking request on their website.',
    '',
    '## Supported platforms',
    'WordPress, Wix, Webflow, Shopify, Squarespace, Typeform, Google Forms, and custom HTML/JavaScript forms.',
    '',
    '## How it works',
    ...howTo.steps.map((step, i) => `${i + 1}. ${step.name}: ${step.text}`),
    '',
    '## Key features',
    '- Universal JSON webhook endpoint per tenant',
    '- Platform-specific payload normalization (WordPress, Typeform, etc.)',
    '- API key or HMAC authentication',
    '- Multi-channel notifications with retry logic',
    '- Dashboard for webhook URL, API key, and channel configuration',
    '',
    '## Frequently asked questions',
    ...faqs.flatMap((faq) => [`### ${faq.question}`, faq.answer, '']),
    '',
    '## Links',
    `- Homepage: ${absoluteUrl('/')}`,
    `- Pricing: ${absoluteUrl('/pricing')}`,
    `- Contact support: ${absoluteUrl('/contact')} (${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@vibe-alerts.com'})`,
    `- Terms of Service: ${absoluteUrl('/terms')}`,
    `- Privacy Policy: ${absoluteUrl('/privacy')}`,
    `- Refunds & Cancellations: ${absoluteUrl('/refunds')}`,
    `- Sign up / login: ${absoluteUrl('/login')}`,
    `- Dashboard: ${absoluteUrl('/dashboard')}`,
    `- Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    `- Webhook API: ${url}/api/v1/webhook/{token} (POST, JSON, requires API key)`,
    '',
    '## Optional',
    `- Full documentation: ${absoluteUrl('/llms-full.txt')}`,
  ];

  return lines.join('\n');
}

/** Extended machine-readable product reference for LLMO */
export function buildLlmsFullTxt() {
  const faqs = getMarketingFaqs();

  return [
    `# ${SITE.name} — Full Reference`,
    '',
    '## Product',
    SITE.description,
    '',
    '## Stack',
    'Next.js 15, Supabase (auth + Postgres), Stripe (subscriptions), Telegram Bot API, Vercel/Railway hosting.',
    '',
    '## Authentication',
    '- Dashboard: Supabase email/password session',
    '- Webhooks: X-VibeAlerts-Key header or HMAC signature (X-VibeAlerts-Signature + X-VibeAlerts-Timestamp)',
    '',
    '## Webhook endpoint',
    'POST /api/v1/webhook/{webhook_token}',
    'Content-Type: application/json',
    'Optional header: X-VibeAlerts-Platform (wordpress, wix, typeform, etc.)',
    '',
    '## Notification channels',
    'Telegram (chat ID + platform bot), Email (Resend), Slack (incoming webhook URL), Discord (incoming webhook URL), Teams (incoming webhook URL), WhatsApp (Meta Cloud API).',
    '',
    '## Pricing model',
    'Stripe subscription required for active webhook processing. Inactive subscriptions receive HTTP 402.',
    `Public pricing: ${absoluteUrl('/pricing')}`,
    `Refund & cancellation policy: ${absoluteUrl('/refunds')}`,
    '',
    '## FAQ',
    ...faqs.flatMap((faq) => [`Q: ${faq.question}`, `A: ${faq.answer}`, '']),
    '',
    `Site: ${getSiteUrl()}`,
  ].join('\n');
}
