# Shopify App — VibeAlerts

Proper Shopify App install (OAuth) with automatic Admin webhook subscriptions. Merchants choose which store events trigger notifications. Manual Flow / Liquid webhooks remain as optional fallbacks.

## Features

- OAuth install (offline access token, encrypted at rest)
- Automatic webhook sync for selected + required GDPR/lifecycle topics
- Merchant event picker: orders, customers, refunds, abandoned carts / checkouts
- App Store–ready landing at `/install/shopify`
- Inbound webhooks → `NotificationService` → enabled channels

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `SHOPIFY_API_KEY` | Yes | Partner app client ID |
| `SHOPIFY_API_SECRET` | Yes | Partner app secret (HMAC) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app origin (redirect + webhook address) |
| `CREDENTIALS_ENCRYPTION_KEY` | Yes | AES-256-GCM for offline tokens (`openssl rand -hex 32`) |
| `SHOPIFY_SCOPES` | No | Defaults to orders/customers/checkouts read scopes |
| `SHOPIFY_API_VERSION` | No | Default `2025-07` |

## Partner Dashboard / App Store

1. Create an app in the [Shopify Partner Dashboard](https://partners.shopify.com/).
2. Set **App URL** to `https://yourdomain.com/install/shopify`.
3. Set **Allowed redirection URL(s)** to `https://yourdomain.com/api/shopify/auth/callback`.
4. Copy Client ID / Secret into `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`.
5. Request scopes matching `shopify.app.toml` / `SHOPIFY_SCOPES`.
6. Run migration `008_shopify_app.sql`.
7. Submit for App Store review when ready (compliance webhooks are registered on install).

`shopify.app.toml` scaffolds CLI / Partner config — replace `YOUR_DOMAIN` and `client_id`.

## Merchant flow

1. Sign in to VibeAlerts (active subscription required to receive alerts).
2. Dashboard → **Shopify App** → enter `store.myshopify.com` → **Install Shopify App**.
3. Authorize on Shopify → redirect back to dashboard.
4. Select notification events → **Save event preferences** (re-syncs Admin webhooks).

App Store installs hit `/install/shopify?shop=…` → continue to `/api/shopify/auth` (login if needed) → OAuth.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/shopify/auth?shop=` | Start OAuth (session required) |
| GET | `/api/shopify/auth/callback` | OAuth callback + webhook sync |
| POST | `/api/shopify/webhooks` | Unified HMAC webhook receiver |
| GET | `/api/dashboard/shopify/status` | Connection + available topics |
| POST | `/api/dashboard/shopify/connect` | Return OAuth URL |
| POST | `/api/dashboard/shopify/disconnect` | Remove webhooks + clear token |
| PUT | `/api/dashboard/shopify/topics` | Update selected events + re-sync |

## Database

Migration `008_shopify_app.sql`:

- `shopify_shops` — per-shop install, encrypted token, `enabled_topics`, webhook ids
- `shopify_webhook_events` — idempotency by `X-Shopify-Webhook-Id`

Service-role only (RLS enabled, no anon policies) — same pattern as WhatsApp connections.

## Selectable topics

Defaults: `orders/create`, `orders/paid`, `customers/create`, `refunds/create`.

Also available: cancelled/fulfilled orders, checkout create/update (abandoned carts).

Always registered (not merchant-toggleable): `app/uninstalled`, `customers/data_request`, `customers/redact`, `shop/redact`.
