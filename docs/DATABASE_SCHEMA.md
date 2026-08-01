# Database Schema Reference — VibeAlerts

Run migrations in order: `001` → `002` (optional) → `003`.

## public.profiles

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | References `auth.users(id)` |
| `email` | TEXT | From auth signup |
| `webhook_token` | UUID, unique | Auto-generated URL token |
| `stripe_subscription_status` | TEXT | Default `'inactive'` |

## public.channel_configs

**Generic per-tenant plugin configuration** — one row per user per notification channel.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID FK | Tenant |
| `channel` | TEXT | Plugin id (`telegram`, `email`, …) |
| `config` | JSONB | Plugin-specific config validated by registry |
| `enabled` | BOOLEAN | Whether plugin receives webhooks |
| `connected_at` | TIMESTAMPTZ | Set when config is saved |

Unique constraint: `(user_id, channel)`

Example rows:
```json
{ "channel": "telegram", "config": { "chat_id": "123456789" }, "enabled": true }
{ "channel": "slack", "config": { "webhook_url": "https://hooks.slack.com/..." }, "enabled": true }
```

## public.user_settings

Webhook security and rate limits only — no channel-specific fields.

| Column | Type | Notes |
|--------|------|-------|
| `webhook_secret` | TEXT | HMAC signing (server-only) |
| `api_key` | TEXT | Alternative auth |
| `rate_limit_per_minute` | INT | Default 60 |
| `last_webhook_at` | TIMESTAMPTZ | Last successful webhook |

## public.webhook_events

| Column | Type | Notes |
|--------|------|-------|
| `delivery_summary` | JSONB | `[{ channel, success, error }]` per plugin |
| `processing_status` | TEXT | `pending`, `processing`, `completed`, `failed`, `rejected` |

## public.notification_logs

| Column | Type | Notes |
|--------|------|-------|
| `channel` | TEXT | Plugin id (no enum — supports future plugins) |
| `status` | TEXT | `pending`, `sent`, `failed`, `retrying` |

## Plugin Registry

Notification channels are registered in `lib/notifications/registry.js`:

```js
registerPlugin({
  id: 'telegram',
  version: '1.0.0',
  label: 'Telegram',
  provider: new TelegramProvider(),
  configSchema: [...],
  setupGuide: [...],
});
```

To add a new channel: implement a provider, call `registerPlugin()`, run no migration needed (channel is TEXT).
