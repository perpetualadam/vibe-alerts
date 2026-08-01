/**
 * Platform-specific webhook integration examples.
 * All platforms POST JSON to the same VibeAlerts endpoint.
 */

export const INTEGRATIONS = {
  wordpress: {
    title: 'WordPress',
    description: 'Use WP Webhooks, Uncanny Automator, or a small mu-plugin.',
    snippet: `// functions.php or custom plugin
add_action('wpcf7_mail_sent', function ($contact_form) {
  $submission = WPCF7_Submission::get_instance();
  $data = $submission->get_posted_data();
  wp_remote_post('YOUR_WEBHOOK_URL', [
    'headers' => [
      'Content-Type' => 'application/json',
      'X-VibeAlerts-Key' => 'YOUR_API_KEY',
    ],
    'body' => wp_json_encode($data),
  ]);
});`,
  },
  wix: {
    title: 'Wix',
    description: 'Use Wix Automations → Custom Webhook or Velo backend.',
    snippet: `// Velo backend web-module
import { fetch } from 'wix-fetch';

export async function submitForm(formData) {
  await fetch('YOUR_WEBHOOK_URL', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VibeAlerts-Key': 'YOUR_API_KEY',
    },
    body: JSON.stringify(formData),
  });
}`,
  },
  webflow: {
    title: 'Webflow',
    description: 'Site Settings → Integrations → Webhooks on form submit.',
    snippet: `Configure Webflow webhook URL:
YOUR_WEBHOOK_URL

Add custom header:
X-VibeAlerts-Key: YOUR_API_KEY`,
  },
  html: {
    title: 'Any HTML / JavaScript',
    description: 'Vanilla fetch from your form submit handler.',
    snippet: `document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  await fetch('YOUR_WEBHOOK_URL', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VibeAlerts-Key': 'YOUR_API_KEY',
    },
    body: JSON.stringify(data),
  });
});`,
  },
};
