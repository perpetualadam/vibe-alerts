# Webflow → VibeAlerts

Forward Webflow form submissions via site webhooks.

## Setup

1. Webflow → **Site Settings → Integrations / Forms → Webhooks** (features vary by plan).
2. Create a webhook for **Form submission**.
3. URL = your VibeAlerts Webhook URL.
4. Add headers when supported:
   - `X-VibeAlerts-Platform: webflow`
   - `X-VibeAlerts-Key: <your API key>`
5. Publish the site.
6. In VibeAlerts, click **Send Test Notification**, then submit a live Webflow form.

See also the Integration Wizard at `/dashboard/setup` → Webflow.
