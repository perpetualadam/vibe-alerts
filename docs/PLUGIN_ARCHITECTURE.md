# Plugin Architecture

VibeAlerts notification channels are **plugins** registered at startup and orchestrated by **NotificationService**.

```
Webhook  →  NotificationService  →  Enabled Providers
                │
                ├── TelegramProvider.send()
                ├── EmailProvider.send()      (Resend)
                ├── DiscordProvider.send()
                ├── TeamsProvider.send()
                ├── WhatsAppProvider.send()
                └── SlackProvider.send()
```

The webhook endpoint **never** imports or calls providers directly.

Built-in channels: Telegram, Email (Resend), WhatsApp, Slack, Discord, and Microsoft Teams.

WhatsApp uses the official Meta Cloud API with **per-tenant** credentials (WABA ID, Phone Number ID, encrypted access token) stored in `whatsapp_connections`. See migration `005_whatsapp_connections.sql` and `lib/whatsapp/`.

## Common provider interface

Every provider extends `NotificationProvider` and implements:

| Method | Purpose |
|--------|---------|
| `send(context)` | Deliver a lead/alert payload |
| `test(context)` | Send a test notification |
| `healthCheck(context?)` | Report platform / tenant readiness |
| `validateConfig(config)` | Validate tenant config |
| `formatMessage(payload)` | Channel-specific formatting |
| `isPlatformReady()` | Server credential gate |

Multiple providers may be enabled at once. One inbound webhook notifies **every** enabled & configured provider.

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
  // test() and healthCheck() inherit sensible defaults from the base class
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
Webhook POST /api/v1/webhook/[token]
  → processor.js (auth, validate payload)
  → fetchChannelConfigs(userId)
  → notificationService.notify({ channelConfigs, payload })
  → registry.getEnabledProviders(channelConfigs)
  → for each configured provider:
        provider.send(context)   // or provider.test() for dashboard tests
  → notification_logs

Dashboard test:
  POST /api/dashboard/notifications/test
  → notificationService.test(...)
  → provider.test() on each enabled provider
```

## Key Files

| File | Role |
|------|------|
| `lib/notifications/service.js` | `NotificationService` orchestrator (`notify`, `test`, `healthCheck`) |
| `lib/notifications/registry.js` | `registerPlugin()`, `getPluginCatalog()` |
| `lib/notifications/plugins/index.js` | Built-in plugin bootstrap |
| `lib/notifications/providers/base.js` | Common interface (`send` / `test` / `healthCheck`) |
| `lib/notifications/providers/*.js` | Telegram, Email, Discord, Teams, WhatsApp, Slack |
| `lib/channel-configs/db.js` | Generic `channel_configs` table |
| `app/api/dashboard/plugins/route.js` | Client-safe plugin metadata |
| `app/api/dashboard/notifications/test/route.js` | Multi-provider test via NotificationService |
| `app/api/dashboard/notifications/health/route.js` | Multi-provider health checks |
