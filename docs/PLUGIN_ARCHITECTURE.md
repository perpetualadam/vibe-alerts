# Plugin Architecture

VibeAlerts notification channels are **plugins** registered at startup.

Built-in channels today: Telegram, Email, WhatsApp, Slack, Discord, and Microsoft Teams.
Discord is a first-class webhook channel (same pattern as Slack/Teams) — enable it from the dashboard with an Incoming Webhook URL.

## Adding a New Channel

### 1. Implement the provider

```js
// lib/notifications/providers/sms.js
import { NotificationProvider } from './base';

export class SmsProvider extends NotificationProvider {
  static id = 'sms';
  static version = '1.0.0';
  static label = 'SMS';
  static description = 'SMS alerts via your provider';
  static configSchema = [
    { key: 'to', label: 'Phone Number', type: 'tel', required: true },
  ];
  static setupGuide = ['Enter the phone number that should receive SMS alerts.'];

  validateConfig(config) { /* return { valid, config?, error? } */ }
  formatMessage(payload) { /* provider-owned formatting */ }
  async send(context) { /* use this.getConfig(context) */ }
}

export const smsPlugin = {
  id: SmsProvider.id,
  version: SmsProvider.version,
  label: SmsProvider.label,
  description: SmsProvider.description,
  configSchema: SmsProvider.configSchema,
  setupGuide: SmsProvider.setupGuide,
  provider: new SmsProvider(),
};
```

### 2. Register the plugin

```js
// lib/notifications/plugins/index.js
import { smsPlugin } from '../providers/sms';
builtInPlugins.push(smsPlugin);
```

No database migration required — `channel_configs.channel` is free-form TEXT.

### 3. Dashboard auto-discovers it

`GET /api/dashboard/plugins` returns `configSchema` and `setupGuide` from the registry.
The dashboard renders forms dynamically — no UI code changes needed.

## Data Flow

```
Webhook POST
  → processor.js (auth, validate payload)
  → fetchChannelConfigs(userId)
  → deliverNotifications({ channelConfigs, payload })
  → registry.getEnabledProviders(channelConfigs)
  → provider.formatMessage(payload)   ← provider-owned
  → provider.send(context)
  → notification_logs
```

## Key Files

| File | Role |
|------|------|
| `lib/notifications/registry.js` | `registerPlugin()`, `getPluginCatalog()` |
| `lib/notifications/plugins/index.js` | Built-in plugin bootstrap |
| `lib/notifications/providers/base.js` | Plugin contract |
| `lib/notifications/providers/discord.js` | Discord Incoming Webhook provider |
| `lib/channel-configs/db.js` | Generic `channel_configs` table |
| `app/api/dashboard/plugins/route.js` | Client-safe plugin metadata |

## Plugin Contract

Every provider must implement:

- `static configSchema` — dashboard form fields
- `validateConfig(config)` — tenant config validation
- `formatMessage(payload)` — channel-specific formatting
- `formatPreview(payload)` — log preview (inherited default)
- `send(context)` — delivery logic
- `isPlatformReady()` — optional server credential check
