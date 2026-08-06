# Native website integrations

First-class connectors for the platforms below. Each has a dedicated setup guide (registry `setupSteps` + Integration Wizard) and **Send Test Notification**.

| Platform | Id | Connector |
|----------|----|-----------|
| Wix | `wix` | Automations HTTP / `integrations/wix/` |
| Squarespace | `squarespace` | `integrations/squarespace/vibe-alerts.js` |
| Webflow | `webflow` | Site form webhooks / `integrations/webflow/` |
| Jotform | `jotform` | WebHooks / `integrations/jotform/` |
| Typeform | `typeform` | Native webhooks / `integrations/typeform/` |
| Gravity Forms | `gravity_forms` | WordPress plugin bridge |
| Elementor Forms | `elementor_forms` | WordPress plugin bridge |
| Contact Form 7 | `contact_form_7` | WordPress plugin bridge |
| WPForms | `wpforms` | WordPress plugin bridge |
| Fluent Forms | `fluent_forms` | WordPress plugin bridge |

## Send Test Notification

- Dashboard → Website Platform Integrations → **Send Test Notification**
- Setup Wizard → **Send Test Notification**
- API: `POST /api/dashboard/integrations/test` with `{ "platform": "<id>" }`

Tests run through the real webhook processor and fan out to enabled notification channels (subscription required).

## WordPress form plugins

Install `integrations/wordpress/vibealerts`. The plugin maps each bridge source to a first-class `X-VibeAlerts-Platform` header (`contact_form_7`, `wpforms`, …) so analytics and the wizard can attribute the form tool correctly.
