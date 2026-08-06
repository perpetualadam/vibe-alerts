# Typeform → VibeAlerts

Connect Typeform’s native `form_response` webhook to VibeAlerts.

## Setup

1. Open your form → **Connect → Webhooks → Add a webhook**.
2. Endpoint URL = your VibeAlerts Webhook URL.
3. Add custom/secret headers:
   - `X-VibeAlerts-Platform: typeform`
   - `X-VibeAlerts-Key: <your API key>`
4. Enable the webhook.
5. In VibeAlerts, use **Send Test Notification**, then submit a real Typeform response.

Answers are mapped from field `ref` / `title` into flat alert fields (name, email, message, …).
