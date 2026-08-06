/**
 * Wizard platform catalog — tailored setup copy for the Integration Wizard.
 * IDs align with lib/integrations/registry where possible (`custom` → `html`).
 */

/**
 * @typedef {Object} WizardStep
 * @property {string} title
 * @property {string} body
 * @property {'text'|'credentials'|'code'|'link'|'note'} [kind]
 * @property {string} [href]
 * @property {string} [codeKey] - snippet key for client fetch (html)
 */

/**
 * @typedef {Object} WizardPlatform
 * @property {string} id - wizard id (custom for HTML)
 * @property {string} integrationId - registry / webhook platform header id
 * @property {string} label
 * @property {string} description
 * @property {string} blurb
 * @property {WizardStep[]} steps
 * @property {string[]} tips
 */

/** @type {WizardPlatform[]} */
export const WIZARD_PLATFORMS = [
  {
    id: 'wordpress',
    integrationId: 'wordpress',
    label: 'WordPress',
    description: 'Contact Form 7, WPForms, Gravity, Fluent, Elementor',
    blurb: 'Install the native VibeAlerts plugin — forms are detected automatically.',
    steps: [
      {
        kind: 'text',
        title: 'Download the plugin',
        body: 'From your VibeAlerts repo or release: package with npm run package:wordpress, or upload the vibealerts folder from integrations/wordpress/.',
      },
      {
        kind: 'text',
        title: 'Upload & activate',
        body: 'In WordPress: Plugins → Add New → Upload Plugin. Activate VibeAlerts.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Go to Settings → VibeAlerts. Paste your Webhook URL and API Key from the next wizard step (shown again below).',
      },
      {
        kind: 'text',
        title: 'Optional: Send Test Alert',
        body: 'Use Send Test Alert in the plugin settings, or continue to the Test connection step in this wizard.',
      },
    ],
    tips: [
      'No per-form webhook setup — CF7, WPForms, Gravity, Fluent, and Elementor are auto-detected.',
      'Keep the API key private (WordPress admins only).',
    ],
  },
  {
    id: 'shopify',
    integrationId: 'shopify',
    label: 'Shopify',
    description: 'Orders, contact forms, and Shopify Flow',
    blurb: 'Connect via Shopify Flow HTTP request or a theme Liquid snippet.',
    steps: [
      {
        kind: 'text',
        title: 'Option A — Shopify Flow (recommended)',
        body: 'In Shopify Admin → Flow, create a workflow for the events you care about (e.g. order created, contact form). Add a Send HTTP request action.',
      },
      {
        kind: 'credentials',
        title: 'Configure the HTTP request',
        body: 'Method POST. URL = your Webhook URL. Headers: X-VibeAlerts-Platform: shopify and X-VibeAlerts-Key: your API key. Body: JSON with the fields you want in alerts.',
      },
      {
        kind: 'text',
        title: 'Option B — Theme contact form',
        body: 'Add the snippet integrations/shopify/vibe-alerts-contact.liquid to your theme and wire it to your contact form submit handler.',
      },
      {
        kind: 'note',
        title: 'Coming soon',
        body: 'A one-click Shopify App (OAuth + automatic webhooks) is available on the Shopify App branch when enabled for your deployment.',
      },
    ],
    tips: [
      'Always include the platform and API key headers on Flow requests.',
      'Test with a draft order or the wizard Test connection step below.',
    ],
  },
  {
    id: 'google_forms',
    integrationId: 'google_forms',
    label: 'Google Forms',
    description: 'Apps Script on form submit',
    blurb: 'Use the Apps Script connector so each response posts to VibeAlerts.',
    steps: [
      {
        kind: 'text',
        title: 'Open your form’s script editor',
        body: 'In Google Forms: ⋮ → Script editor. Create or open the bound Apps Script project.',
      },
      {
        kind: 'text',
        title: 'Paste the connector',
        body: 'Copy integrations/google-forms/vibe-alerts.gs into the script. Set WEBHOOK_URL and API_KEY to your credentials.',
      },
      {
        kind: 'text',
        title: 'Install the trigger',
        body: 'Run setupTrigger() once (authorize when prompted). New responses will POST to VibeAlerts with X-VibeAlerts-Platform: google_forms.',
      },
    ],
    tips: [
      'Re-authorize if you change Google accounts.',
      'Submit a real test response, or use Test connection in this wizard.',
    ],
  },
  {
    id: 'wix',
    integrationId: 'wix',
    label: 'Wix',
    description: 'Automations HTTP request or Velo',
    blurb: 'Send form events with a Wix Automation or Velo backend call.',
    steps: [
      {
        kind: 'text',
        title: 'Automations path',
        body: 'Wix Dashboard → Automations → New automation. Trigger: form submitted (or your event). Action: Send HTTP request / webhook.',
      },
      {
        kind: 'credentials',
        title: 'Point at VibeAlerts',
        body: 'URL = Webhook URL. Method POST. Headers: X-VibeAlerts-Platform: wix and X-VibeAlerts-Key: your API key. Map form fields into a JSON body.',
      },
      {
        kind: 'text',
        title: 'Optional — Velo',
        body: 'Use integrations/wix/vibe-alerts.web.js in your backend web module if you prefer code over Automations.',
      },
    ],
    tips: ['Confirm the automation is published, not only saved as draft.'],
  },
  {
    id: 'squarespace',
    integrationId: 'squarespace',
    label: 'Squarespace',
    description: 'Code Injection form connector',
    blurb: 'Squarespace has no native outbound webhooks — use the footer script connector.',
    steps: [
      {
        kind: 'text',
        title: 'Open Code Injection',
        body: 'Settings → Advanced → Code Injection → Footer.',
      },
      {
        kind: 'text',
        title: 'Paste the connector script',
        body: 'Use integrations/squarespace/vibe-alerts.js. Set your Webhook URL and API Key in the script config.',
      },
      {
        kind: 'note',
        title: 'Form markup',
        body: 'The script listens for Squarespace form submits on the page. Publish the site after injecting code.',
      },
    ],
    tips: ['Code Injection requires a plan that supports it.', 'Hard-refresh the page after publishing.'],
  },
  {
    id: 'webflow',
    integrationId: 'webflow',
    label: 'Webflow',
    description: 'Site form submission webhooks',
    blurb: 'Use Webflow’s form webhook to forward submissions to VibeAlerts.',
    steps: [
      {
        kind: 'text',
        title: 'Open Site settings',
        body: 'Webflow Designer / Dashboard → Site Settings → Integrations / Forms (wording varies by plan).',
      },
      {
        kind: 'credentials',
        title: 'Add a form webhook',
        body: 'Create a webhook for form submission. URL = your VibeAlerts Webhook URL. Add headers X-VibeAlerts-Platform: webflow and X-VibeAlerts-Key: your API key if your plan supports custom headers (otherwise put the key in a hidden field and contact support for HMAC).',
      },
      {
        kind: 'text',
        title: 'Publish',
        body: 'Publish the site, submit a test form, then run Test connection (or verify from site) in this wizard.',
      },
    ],
    tips: ['Webflow webhook features depend on your workspace plan.'],
  },
  {
    id: 'custom',
    integrationId: 'html',
    label: 'Custom',
    description: 'Any HTML form or JavaScript site',
    blurb: 'Drop in the HTML/JS snippet or POST JSON from your own backend.',
    steps: [
      {
        kind: 'code',
        title: 'Add the JS connector',
        body: 'Copy the generated HTML snippet (button below) before </body>. It posts forms marked with data-vibealerts-form.',
        codeKey: 'html',
      },
      {
        kind: 'text',
        title: 'Mark your forms',
        body: 'Add data-vibealerts-form to each <form> you want to forward — or POST JSON yourself with the headers shown in Credentials.',
      },
      {
        kind: 'credentials',
        title: 'Or call the API directly',
        body: 'POST JSON to your Webhook URL with X-VibeAlerts-Platform: html and X-VibeAlerts-Key: your API key.',
      },
    ],
    tips: [
      'Works on static sites, Next.js, Rails, etc.',
      'Prefer HTTPS pages so the browser can call your webhook.',
    ],
  },
];

/** Ordered checklist shown in the wizard UI */
export const WIZARD_CHECKLIST = [
  {
    id: 'platform',
    label: 'Choose platform',
    description: 'Pick WordPress, Shopify, Google Forms, and more',
  },
  {
    id: 'credentials',
    label: 'Copy credentials',
    description: 'Webhook URL and API key for your site',
  },
  {
    id: 'instructions',
    label: 'Follow setup steps',
    description: 'Platform-specific install instructions',
  },
  {
    id: 'test',
    label: 'Test connection',
    description: 'Verify a webhook reaches VibeAlerts',
  },
  {
    id: 'complete',
    label: 'Mark complete',
    description: 'Finish the wizard when the test passes',
  },
];

export const DEFAULT_WIZARD_STEPS = {
  platform: false,
  credentials: false,
  instructions: false,
  test: false,
  complete: false,
};

/**
 * @param {string} id
 */
export function getWizardPlatform(id) {
  return WIZARD_PLATFORMS.find((p) => p.id === id) || null;
}

/**
 * Map wizard id → integration header id.
 * @param {string} wizardId
 */
export function toIntegrationId(wizardId) {
  const p = getWizardPlatform(wizardId);
  return p?.integrationId || wizardId;
}
