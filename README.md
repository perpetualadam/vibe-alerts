# VibeAlerts

Multi-tenant B2B SaaS that routes website form submissions to Telegram via webhooks. **Website-agnostic** — works with WordPress, Wix, Webflow, Shopify, or any platform that can POST JSON.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS**
- **Supabase** (Auth + Postgres + RLS)
- **Stripe** (Subscriptions)
- **Telegram Bot API**

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in Supabase, Stripe, and Telegram credentials
npm run dev
```

1. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
2. Create a Telegram bot via [@BotFather](https://t.me/BotFather)
3. Configure Stripe webhook → `https://your-domain.com/api/stripe/webhook`
4. Set `STRIPE_PRICE_ID` to your recurring subscription price ID
5. Sign up at `/login`, subscribe from `/dashboard`, configure channels

## Project Structure

```
app/
├── api/
│   ├── v1/webhook/[token]/route.js   # Universal webhook receiver
│   ├── stripe/checkout/route.js      # Stripe Checkout session
│   ├── stripe/portal/route.js        # Stripe Customer Portal
│   ├── stripe/webhook/route.js       # Stripe subscription sync
│   └── dashboard/                    # Authenticated dashboard APIs
├── dashboard/page.js               # Owner dashboard UI
└── login/page.js
lib/
├── notifications/                  # Provider pattern (Telegram, Email, …)
├── webhook/                        # Auth, validation, processor
├── supabase/                       # Client, server, admin
├── env.js                          # Env validation
├── logger.js                       # Structured logging
└── rate-limit.js                   # Upstash or in-memory
supabase/migrations/                # Database schema + RLS
```

## Webhook Integration (Any Website)

**Endpoint:** `POST {APP_URL}/api/v1/webhook/{webhook_token}`

**Auth (choose one):**

| Method | Headers |
|--------|---------|
| HMAC (recommended) | `X-VibeAlerts-Signature`, `X-VibeAlerts-Timestamp` |
| API Key (CMS-friendly) | `X-VibeAlerts-Key` |

**Body:** Any JSON object — field names are dynamic.

```javascript
// Works from WordPress, Wix Velo, Webflow, or vanilla JS
fetch("https://vibe-alerts.com/api/v1/webhook/YOUR-TOKEN", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-VibeAlerts-Key": "your-api-key"
  },
  body: JSON.stringify({
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+15551234567",
    message: "Interested in your services"
  })
});
```

## Security Features

- HMAC-SHA256 signatures + timestamp replay protection
- API key alternative for platforms without HMAC support
- CSRF protection on dashboard mutations (custom header + Origin validation)
- Security headers on all routes (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting (Upstash Redis required in production)
- Payload size limits enforced before body buffering
- Webhook auth verified before rate limiting (prevents unauthenticated DoS)
- RLS column guards on billing/secrets (migration 004)
- Stripe webhook idempotency (duplicate event dedup)
- Markdown injection sanitization
- Outbound SSRF protection (Slack/Teams webhook URL allowlisting)
- RLS on all user tables
- Server-only secrets never exposed to client

Run migrations in order: `001` → `003` → `004`.

## Deployment (Vercel + Cloudflare)

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full step-by-step checklist including domain, Vercel/Railway, Cloudflare, Stripe, and SEO verification.

See **[docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)** for Cloudflare WAF, cache, webhook-safe configuration, and **Email Routing + Resend SPF** coexistence (`npm run verify:email-dns`).

**Quick deploy to Vercel:**

1. Push to GitHub → import in Vercel
2. Set env vars from `.env.example`
3. Connect domain via Cloudflare DNS
4. Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
5. Run Supabase migrations `001` → `003` → `004`
6. Verify: `/api/health`, `/sitemap.xml`, `/llms.txt`

## SEO / AEO / LLMO

Built-in discoverability:

| URL | Purpose |
|-----|---------|
| `/sitemap.xml` | Search engine sitemap |
| `/robots.txt` | Crawl directives |
| `/llms.txt` | AI crawler product summary (LLMO) |
| `/llms-full.txt` | Extended machine-readable docs |
| `/opengraph-image` | Social sharing image |

Homepage includes FAQ + HowTo JSON-LD for answer engines (AEO).

## Notification Channels

All notification channels are implemented via the provider pattern in `lib/notifications/providers/`:

| Channel | Config (dashboard) | Server env vars |
|---------|-------------------|-----------------|
| Telegram | Chat ID | `TELEGRAM_BOT_TOKEN` |
| Email | Recipient email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| WhatsApp | Phone number | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| Slack | Incoming Webhook URL | — (per-tenant) |
| Discord | Incoming Webhook URL | — (per-tenant) |
| Microsoft Teams | Incoming Webhook URL | — (per-tenant) |

Run migrations in order: `001` → `003` (003 supersedes 002) → `004` (security hardening).

## License

Private — VibeAlerts
