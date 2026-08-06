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
 * @property {boolean} [native] - Prompt 14 first-class native integration
 */

/** @type {WizardPlatform[]} */
export const WIZARD_PLATFORMS = [
  {
    id: 'wix',
    integrationId: 'wix',
    label: 'Wix',
    description: 'Wix Forms via Automations or Velo',
    blurb: 'Send form events with a Wix Automation HTTP request or Velo backend call.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Create an automation',
        body: 'Wix Dashboard → Automations → New automation. Trigger: form submitted (or your form event). Action: Send HTTP request / webhook.',
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
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Use Send test from wizard below, or Send Test Notification on the dashboard Integrations panel.',
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
    native: true,
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
        title: 'Publish & test',
        body: 'Publish the site, then use Send Test Notification in VibeAlerts and submit a live form block.',
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
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Open Site settings',
        body: 'Webflow Designer / Dashboard → Site Settings → Integrations / Forms (wording varies by plan).',
      },
      {
        kind: 'credentials',
        title: 'Add a form webhook',
        body: 'Create a webhook for form submission. URL = your VibeAlerts Webhook URL. Add headers X-VibeAlerts-Platform: webflow and X-VibeAlerts-Key: your API key when custom headers are available.',
      },
      {
        kind: 'text',
        title: 'Publish & test',
        body: 'Publish the site. Use Send test from wizard, then submit a real Webflow form.',
      },
    ],
    tips: ['Webflow webhook features depend on your workspace plan.'],
  },
  {
    id: 'jotform',
    integrationId: 'jotform',
    label: 'Jotform',
    description: 'Jotform WebHooks or Zapier/Make',
    blurb: 'Forward each Jotform submission to your VibeAlerts webhook.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Open WebHooks',
        body: 'In Jotform: Form → Settings → Integrations → WebHooks → Add WebHook.',
      },
      {
        kind: 'credentials',
        title: 'Paste VibeAlerts credentials',
        body: 'Webhook URL = your VibeAlerts URL. Prefer custom headers X-VibeAlerts-Platform: jotform and X-VibeAlerts-Key: your API key. If headers are unavailable, use Zapier/Make as a proxy.',
      },
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Use Send test from wizard to deliver a sample Jotform-shaped payload, then submit a real form.',
      },
    ],
    tips: [
      'Native Jotform webhooks often send rawRequest as a JSON string — VibeAlerts flattens q*_ fields automatically.',
    ],
  },
  {
    id: 'typeform',
    integrationId: 'typeform',
    label: 'Typeform',
    description: 'Native Typeform webhooks',
    blurb: 'Connect Typeform’s form_response webhook directly to VibeAlerts.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Open Connect → Webhooks',
        body: 'In Typeform: open your form → Connect → Webhooks → Add a webhook.',
      },
      {
        kind: 'credentials',
        title: 'Configure the webhook',
        body: 'Endpoint URL = your VibeAlerts Webhook URL. Add secret/custom headers: X-VibeAlerts-Key and X-VibeAlerts-Platform: typeform.',
      },
      {
        kind: 'text',
        title: 'Enable & test',
        body: 'Enable the webhook. Use Send test from wizard, then submit a Typeform response.',
      },
    ],
    tips: ['Answers are mapped from field refs/titles into flat alert fields.'],
  },
  {
    id: 'gravity_forms',
    integrationId: 'gravity_forms',
    label: 'Gravity Forms',
    description: 'WordPress Gravity Forms via VibeAlerts plugin',
    blurb: 'Install the VibeAlerts WordPress plugin — Gravity Forms entries are detected automatically.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Install Gravity Forms',
        body: 'Activate Gravity Forms on your WordPress site (any license that can receive entries).',
      },
      {
        kind: 'text',
        title: 'Install VibeAlerts',
        body: 'Upload the vibealerts plugin (npm run package:wordpress or integrations/wordpress/vibealerts). Activate it.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Settings → VibeAlerts: paste Webhook URL + API Key. Confirm Gravity Forms is listed under Detected form plugins.',
      },
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Use Send test from wizard or Send Test Alert in WordPress, then submit a Gravity Form.',
      },
    ],
    tips: ['No per-form webhook configuration is required inside Gravity Forms.'],
  },
  {
    id: 'elementor_forms',
    integrationId: 'elementor_forms',
    label: 'Elementor Forms',
    description: 'Elementor Pro Forms via VibeAlerts plugin',
    blurb: 'The WordPress plugin bridges Elementor Pro form submissions to VibeAlerts.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Enable Elementor Forms',
        body: 'Use Elementor Pro with the Forms widget on your WordPress site.',
      },
      {
        kind: 'text',
        title: 'Install VibeAlerts',
        body: 'Activate the VibeAlerts plugin and open Settings → VibeAlerts.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Paste Webhook URL + API Key. Confirm Elementor Forms appears under Detected form plugins.',
      },
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Send a test from this wizard, then submit a published Elementor form.',
      },
    ],
    tips: ['Works with Elementor Pro Forms — free Elementor alone has no Forms widget.'],
  },
  {
    id: 'contact_form_7',
    integrationId: 'contact_form_7',
    label: 'Contact Form 7',
    description: 'WordPress Contact Form 7 via VibeAlerts plugin',
    blurb: 'CF7 submissions are forwarded automatically once the VibeAlerts plugin is configured.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Install Contact Form 7',
        body: 'Activate Contact Form 7 and ensure at least one form is published.',
      },
      {
        kind: 'text',
        title: 'Install VibeAlerts',
        body: 'Upload/activate the VibeAlerts WordPress plugin.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Settings → VibeAlerts: Webhook URL + API Key. Confirm Contact Form 7 is detected.',
      },
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Use Send test from wizard (CF7-shaped payload) or Send Test Alert in WordPress.',
      },
    ],
    tips: ['Common fields your-name / your-email / your-message are mapped to readable labels.'],
  },
  {
    id: 'wpforms',
    integrationId: 'wpforms',
    label: 'WPForms',
    description: 'WordPress WPForms via VibeAlerts plugin',
    blurb: 'WPForms Lite or Pro entries route through the VibeAlerts WordPress plugin.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Install WPForms',
        body: 'Activate WPForms (Lite or Pro) and publish a form.',
      },
      {
        kind: 'text',
        title: 'Install VibeAlerts',
        body: 'Activate the VibeAlerts plugin under Plugins.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Settings → VibeAlerts: paste Webhook URL + API Key. Confirm WPForms is detected.',
      },
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Send a test from this wizard, then submit a WPForms entry on your site.',
      },
    ],
    tips: ['No Zapier step required — the plugin listens for WPForms process_complete.'],
  },
  {
    id: 'fluent_forms',
    integrationId: 'fluent_forms',
    label: 'Fluent Forms',
    description: 'WordPress Fluent Forms via VibeAlerts plugin',
    blurb: 'Fluent Forms submissions are auto-detected by the VibeAlerts WordPress plugin.',
    native: true,
    steps: [
      {
        kind: 'text',
        title: 'Install Fluent Forms',
        body: 'Activate Fluent Forms and publish at least one form.',
      },
      {
        kind: 'text',
        title: 'Install VibeAlerts',
        body: 'Activate the VibeAlerts WordPress plugin.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Settings → VibeAlerts: Webhook URL + API Key. Confirm Fluent Forms is listed as detected.',
      },
      {
        kind: 'note',
        title: 'Send Test Notification',
        body: 'Use Send test from wizard, then submit a Fluent Form on your site.',
      },
    ],
    tips: ['Works with Fluent Forms free and pro.'],
  },
  {
    id: 'wordpress',
    integrationId: 'wordpress',
    label: 'WordPress (all forms)',
    description: 'Umbrella setup for CF7, WPForms, Gravity, Fluent, Elementor',
    blurb: 'One plugin install covers every supported WordPress form plugin.',
    steps: [
      {
        kind: 'text',
        title: 'Download the plugin',
        body: 'Package with npm run package:wordpress, or upload the vibealerts folder from integrations/wordpress/.',
      },
      {
        kind: 'text',
        title: 'Upload & activate',
        body: 'In WordPress: Plugins → Add New → Upload Plugin. Activate VibeAlerts.',
      },
      {
        kind: 'credentials',
        title: 'Paste credentials',
        body: 'Go to Settings → VibeAlerts. Paste your Webhook URL and API Key.',
      },
      {
        kind: 'text',
        title: 'Send Test Alert',
        body: 'Use Send Test Alert in the plugin settings, or Send test from wizard below.',
      },
    ],
    tips: [
      'Prefer the dedicated CF7 / WPForms / Gravity / Elementor / Fluent wizard entries for form-specific guides.',
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
        body: 'In Shopify Admin → Flow, create a workflow for the events you care about. Add a Send HTTP request action.',
      },
      {
        kind: 'credentials',
        title: 'Configure the HTTP request',
        body: 'Method POST. URL = your Webhook URL. Headers: X-VibeAlerts-Platform: shopify and X-VibeAlerts-Key: your API key.',
      },
      {
        kind: 'text',
        title: 'Option B — Theme contact form',
        body: 'Add integrations/shopify/vibe-alerts-contact.liquid to your theme and wire it to your contact form submit handler.',
      },
    ],
    tips: ['Always include the platform and API key headers on Flow requests.'],
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
        body: 'Copy integrations/google-forms/vibe-alerts.gs into the script. Set WEBHOOK_URL and API_KEY.',
      },
      {
        kind: 'text',
        title: 'Install the trigger',
        body: 'Run setupTrigger() once (authorize when prompted).',
      },
    ],
    tips: ['Submit a real test response, or use Test connection in this wizard.'],
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
        body: 'Copy the generated HTML snippet before </body>. It posts forms marked with data-vibealerts-form.',
        codeKey: 'html',
      },
      {
        kind: 'text',
        title: 'Mark your forms',
        body: 'Add data-vibealerts-form to each <form> you want to forward.',
      },
      {
        kind: 'credentials',
        title: 'Or call the API directly',
        body: 'POST JSON to your Webhook URL with X-VibeAlerts-Platform: html and X-VibeAlerts-Key: your API key.',
      },
    ],
    tips: ['Works on static sites, Next.js, Rails, etc.'],
  },
];

/** Ordered checklist shown in the wizard UI */
export const WIZARD_CHECKLIST = [
  {
    id: 'platform',
    label: 'Choose platform',
    description: 'Pick Wix, Typeform, CF7, and more',
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
    description: 'Send a test notification through VibeAlerts',
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
