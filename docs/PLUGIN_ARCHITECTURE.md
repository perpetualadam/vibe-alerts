# Plugin Architecture

VibeAlerts notification channels are **plugins** registered at startup.

## Adding a New Channel

### 1. Implement the provider

```js
// lib/notifications/providers/discord.js
import { NotificationProvider } from './base';

export class DiscordProvider extends NotificationProvider {
  static id = 'discord';
  static version = '1.0.0';
  static label = 'Discord';
  static description = 'Discord webhook alerts';
  static configSchema = [
    { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
  ];
  static setupGuide = ['Create a Discord webhook in channel settings.'];

  validateConfig(config) { /* return { valid, config?, error? } */ }
  formatMessage(payload) { /* provider-owned formatting */ }
  async send(context) { /* use this.getConfig(context) */ }
}

export const discordPlugin = {
  id: DiscordProvider.id,
  version: DiscordProvider.version,
  label: DiscordProvider.label,
  description: DiscordProvider.description,
  configSchema: DiscordProvider.configSchema,
  setupGuide: DiscordProvider.setupGuide,
  provider: new DiscordProvider(),
};
```

### 2. Register the plugin

```js
// lib/notifications/plugins/index.js
import { discordPlugin } from '../providers/discord';
builtInPlugins.push(discordPlugin);
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
