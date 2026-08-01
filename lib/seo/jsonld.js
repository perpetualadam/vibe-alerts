import { SITE, absoluteUrl, getSiteUrl } from '@/lib/seo/site';

/** @returns {object} Organization JSON-LD */
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: getSiteUrl(),
    description: SITE.description,
    logo: absoluteUrl('/opengraph-image'),
  };
}

/** @returns {object} WebSite JSON-LD with search action placeholder */
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: getSiteUrl(),
    description: SITE.description,
    inLanguage: 'en-US',
  };
}

/** @returns {object} SoftwareApplication JSON-LD */
export function buildSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: SITE.category,
    operatingSystem: 'Web',
    url: getSiteUrl(),
    description: SITE.description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Subscription pricing — sign up for details',
    },
  };
}

/**
 * @param {Array<{ question: string, answer: string }>} faqs
 */
export function buildFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * @param {Array<{ name: string, text: string }>} steps
 */
export function buildHowToSchema({ name, description, steps }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

/** Marketing FAQ content used for AEO answer snippets */
export function getMarketingFaqs() {
  return [
    {
      question: 'What is VibeAlerts?',
      answer:
        'VibeAlerts is a SaaS webhook service that forwards website form submissions to Telegram, Email, Slack, Teams, or WhatsApp. It works with WordPress, Wix, Webflow, Shopify, Typeform, Google Forms, and custom HTML forms.',
    },
    {
      question: 'How do I connect my website form to Telegram?',
      answer:
        'Sign up for VibeAlerts, copy your unique webhook URL and API key from the dashboard, then configure your website platform to POST JSON form data to that URL with the X-VibeAlerts-Key header. Alerts arrive in Telegram within seconds.',
    },
    {
      question: 'Which website platforms does VibeAlerts support?',
      answer:
        'VibeAlerts supports WordPress, Wix, Webflow, Shopify, Squarespace, Typeform, Google Forms, and any custom HTML or JavaScript form that can send a JSON POST request.',
    },
    {
      question: 'Do I need to install anything on my server?',
      answer:
        'No server installation is required. VibeAlerts is fully hosted. Some platforms use a small connector script (WordPress plugin, Squarespace Code Injection, or Google Apps Script) that you paste once — no backend hosting needed.',
    },
    {
      question: 'Is VibeAlerts secure?',
      answer:
        'Yes. Webhook requests require an API key or HMAC signature. All traffic is rate-limited, payloads are validated and sanitized, and the dashboard uses CSRF protection, security headers, and row-level database isolation per tenant.',
    },
  ];
}

/** HowTo steps for AEO */
export function getHowToSteps() {
  return {
    name: 'How to send website form submissions to Telegram with VibeAlerts',
    description:
      'Connect any website form to Telegram alerts in three steps using VibeAlerts webhooks.',
    steps: [
      {
        name: 'Create a VibeAlerts account',
        text: 'Sign up at VibeAlerts and activate your subscription. Open the dashboard and copy your webhook URL and API key.',
      },
      {
        name: 'Configure your notification channel',
        text: 'In the dashboard, enable Telegram and enter your Telegram Chat ID. Use Send Test Alert to verify delivery.',
      },
      {
        name: 'Connect your website form',
        text: 'Configure your form platform to POST JSON to your webhook URL with headers X-VibeAlerts-Key and optionally X-VibeAlerts-Platform. Follow the platform-specific setup guide in the dashboard.',
      },
    ],
  };
}

/** Combined JSON-LD graph for homepage */
export function buildHomePageSchemas() {
  const faqs = getMarketingFaqs();
  const howTo = getHowToSteps();

  return [
    buildOrganizationSchema(),
    buildWebSiteSchema(),
    buildSoftwareApplicationSchema(),
    buildFAQSchema(faqs),
    buildHowToSchema(howTo),
  ];
}
