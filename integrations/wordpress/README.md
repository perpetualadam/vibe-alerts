# VibeAlerts WordPress Plugin

Native WordPress plugin that forwards form submissions to VibeAlerts.

## Install from WordPress admin

```bash
# From the repo root
npm run package:wordpress
# → creates integrations/wordpress/dist/vibealerts.zip
```

1. WordPress admin → **Plugins → Add New → Upload Plugin**
2. Upload `vibealerts.zip` and activate
3. **Settings → VibeAlerts** → paste Webhook URL + API Key from your VibeAlerts dashboard
4. Click **Send Test Alert**

Or copy `integrations/wordpress/vibealerts/` into `wp-content/plugins/vibealerts/`.

## Supported form plugins (auto-detected)

| Plugin | Hook |
|--------|------|
| Contact Form 7 | `wpcf7_mail_sent` |
| WPForms | `wpforms_process_complete` |
| Gravity Forms | `gform_after_submission` |
| Fluent Forms | `fluentform_submission_inserted` |
| Elementor Forms | `elementor_pro/forms/new_record` |

No per-form webhook configuration is required inside those plugins.

## API

Outgoing requests:

```
POST {webhook_url}
Content-Type: application/json
X-VibeAlerts-Platform: wordpress
X-VibeAlerts-Key: {api_key}
```
