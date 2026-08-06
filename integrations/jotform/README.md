# Jotform → VibeAlerts

Forward Jotform submissions to your VibeAlerts webhook.

## Setup

1. Open your form → **Settings → Integrations → WebHooks**.
2. Add webhook URL: `https://your-domain.com/api/v1/webhook/<token>` (from the VibeAlerts dashboard).
3. Prefer custom headers when available:
   - `X-VibeAlerts-Platform: jotform`
   - `X-VibeAlerts-Key: <your API key>`
4. If headers are not supported on your plan, use Zapier/Make: **Jotform New Submission → Webhooks POST** with those headers.
5. In VibeAlerts, open the Jotform integration and click **Send Test Notification**.

## Payload notes

Native Jotform webhooks often include `rawRequest` (JSON string) with keys like `q3_name` / `q5_email`. VibeAlerts flattens these automatically.
