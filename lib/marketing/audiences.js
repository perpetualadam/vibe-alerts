/** Marketing copy: who VibeAlerts is for and what problems it solves. */

export const AUDIENCE_SEGMENTS = {
  primary: {
    label: 'Primary audience',
    title: 'Built for owners who live on their phone',
    description:
      'Small businesses and solopreneurs who cannot afford to miss a contact-form lead — and do not have a developer on staff.',
    audiences: [
      {
        icon: '🔧',
        title: 'Local trades & services',
        examples: 'Plumbers, electricians, cleaners, landscapers, mobile beauty',
        problems: [
          {
            problem: 'Form submissions sit in email until you finish a job — the customer already called someone else.',
            solution: 'Get a Telegram alert in seconds and reply while the lead is still hot.',
          },
          {
            problem: 'Checking Wix or WordPress admin from a phone is slow and easy to forget.',
            solution: 'Leads come to the app you already check all day.',
          },
        ],
      },
      {
        icon: '💼',
        title: 'Freelancers & solo agencies',
        examples: 'Designers, photographers, consultants, coaches, virtual assistants',
        problems: [
          {
            problem: 'Inquiry forms blend into a crowded inbox next to newsletters and spam.',
            solution: 'A dedicated notification that reads like a new client knocking.',
          },
          {
            problem: 'Zapier or custom code feels like overkill for one contact form.',
            solution: 'Paste a webhook URL or connector — live in minutes, one flat price.',
          },
        ],
      },
      {
        icon: '🚀',
        title: 'Side projects & micro-businesses',
        examples: 'Landing pages, waitlists, simple service sites',
        problems: [
          {
            problem: 'You built a site but never wired up reliable form notifications.',
            solution: 'Hosted SaaS handles delivery — no server, no maintenance.',
          },
          {
            problem: 'Missing one early signup or beta request slows growth.',
            solution: 'Every submission is logged and pushed to your chosen channel.',
          },
        ],
      },
    ],
  },
  secondary: {
    label: 'Also a great fit',
    title: 'Teams on popular website platforms',
    description:
      'Anyone using a standard contact or quote form on WordPress, Wix, Webflow, or similar — without an ops team watching the inbox.',
    audiences: [
      {
        icon: '📝',
        title: 'WordPress & WooCommerce sites',
        examples: 'Contact Form 7, WPForms, theme contact pages, quote requests',
        problems: [
          {
            problem: 'Plugin emails land in spam or server SMTP breaks silently.',
            solution: 'Bypass flaky mail delivery — webhook straight to Telegram or Slack.',
          },
          {
            problem: 'Multiple forms across pages with no single alert feed.',
            solution: 'One dashboard URL receives every submission with a clear history.',
          },
        ],
      },
      {
        icon: '🎨',
        title: 'Wix, Squarespace & Webflow',
        examples: 'Built-in form blocks, client sites, portfolio inquiries',
        problems: [
          {
            problem: 'Platform notifications are email-only and easy to miss on mobile.',
            solution: 'Route the same form data to instant mobile alerts.',
          },
          {
            problem: 'Clients expect you to respond fast; you are not glued to email.',
            solution: 'Look professional with same-day replies driven by real-time pings.',
          },
        ],
      },
      {
        icon: '🏠',
        title: 'Quote & booking-heavy businesses',
        examples: 'Property, trades lead-gen, tutors, clinics, local professionals',
        problems: [
          {
            problem: '"Request a quote" forms compete on response time — hours lose the job.',
            solution: 'See name, phone, and message immediately in one formatted alert.',
          },
          {
            problem: 'Staff need alerts in Slack or Teams, not another inbox to monitor.',
            solution: 'Enable multiple channels from one account — Telegram, Slack, Discord, Teams, Email.',
          },
        ],
      },
    ],
  },
};
