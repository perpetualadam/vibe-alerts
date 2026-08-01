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
4. Sign up at `/login`, configure dashboard at `/dashboard`

## Project Structure

```
app/
├── api/
│   ├── v1/webhook/[token]/route.js   # Universal webhook receiver
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
- Rate limiting (Upstash Redis in production)
- Payload size limits and JSON validation
- Markdown injection sanitization
- RLS on all user tables
- Server-only secrets never exposed to client

## Deployment (Vercel)

1. Push to GitHub, import in Vercel
2. Set all variables from `.env.example`
3. Add Upstash Redis for distributed rate limiting (recommended)
4. Point Stripe webhook to production URL
5. Set `NEXT_PUBLIC_APP_URL` to your production domain

## Future Channels

All notification channels are implemented via the provider pattern in `lib/notifications/providers/`:

| Channel | Config (dashboard) | Server env vars |
|---------|-------------------|-----------------|
| Telegram | Chat ID | `TELEGRAM_BOT_TOKEN` |
| Email | Recipient email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| WhatsApp | Phone number | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| Slack | Incoming Webhook URL | — (per-tenant) |
| Microsoft Teams | Incoming Webhook URL | — (per-tenant) |

Run migrations in order: `001` → `003` (003 supersedes 002).

## License

Private — VibeAlerts
