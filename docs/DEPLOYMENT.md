# VibeAlerts Deployment Guide

Deploy to **Vercel** (recommended for Next.js) or **Railway**, put **Cloudflare** in front for DNS/CDN/WAF, and connect your **custom domain**.

---

## Priority checklist (do in this order)

### Phase 1 — Accounts & domain (you do manually)

| # | Task | Why |
|---|------|-----|
| 1 | **Buy a domain** (Namecheap, Cloudflare Registrar, Google Domains) | e.g. `vibe-alerts.com` |
| 2 | **Create Vercel account** → import GitHub repo | Easiest Next.js hosting |
| 3 | **Create Supabase project** (if not done) | Auth + database |
| 4 | **Create Stripe account** (test mode first) | Billing |
| 5 | **Create Upstash Redis** (free tier OK) | Required for production rate limiting |
| 6 | **Create Telegram bot** via [@BotFather](https://t.me/BotFather) | Notification channel |

### Phase 2 — Deploy to Vercel (recommended)

| # | Task | Details |
|---|------|---------|
| 7 | Import repo in [Vercel Dashboard](https://vercel.com/new) | Framework: Next.js (auto-detected) |
| 8 | Set environment variables | Copy all from `.env.example` |
| 9 | Set `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` (after domain connected) |
| 10 | Deploy | Vercel runs `npm run build` automatically |
| 11 | Verify health check | `curl https://your-app.vercel.app/api/health` → `{"status":"ok"}` |
| 12 | Run Supabase migrations | `001` → `003` → `004` in SQL Editor |

**Required env vars for production:**

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Phase 3 — Custom domain via Cloudflare

| # | Task | Details |
|---|------|---------|
| 13 | Add site to [Cloudflare](https://dash.cloudflare.com) | Free plan is fine |
| 14 | Update nameservers at registrar | Point to Cloudflare NS records |
| 15 | Add DNS record | `CNAME @ → cname.vercel-dns.com` (or Vercel's assigned domain) |
| 16 | In Vercel → Settings → Domains | Add `yourdomain.com` + `www.yourdomain.com` |
| 17 | Cloudflare SSL/TLS mode | **Full (strict)** |
| 18 | Update `NEXT_PUBLIC_APP_URL` | Redeploy with production domain |
| 19 | **Google Analytics** (optional) | Create GA4 property → set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel → redeploy |

### Phase 4 — Cloudflare hardening (important for webhooks)

| # | Task | Details |
|---|------|---------|
| 19 | **Cache Rules** | Bypass cache for `/api/*` (webhooks must not be cached) |
| 20 | **WAF managed rules** | Enable OWASP core ruleset (Medium) |
| 21 | **Rate limiting rule** | Optional: extra rate limit on `/api/v1/webhook/*` at edge |
| 22 | **Bot Fight Mode** | ⚠️ Test carefully — can block legitimate form POSTs. Start OFF, monitor |
| 23 | **Always Use HTTPS** | Enable |
| 24 | **HSTS** | Enable (Cloudflare → SSL → Edge Certificates) |

**Cloudflare Cache Rule example (Bypass API):**

```
If URI Path starts with /api/ → Cache eligibility: Bypass
```

**Do NOT enable "Under Attack Mode"** unless you're actively mitigating DDoS — it breaks webhook integrations.

### Phase 5 — Stripe & webhooks in production

| # | Task | Details |
|---|------|---------|
| 25 | Stripe product + price | Create recurring **VibeAlerts** subscription price; set `STRIPE_PRICE_ID` in Vercel |
| 26 | Stripe webhook endpoint | `https://yourdomain.com/api/stripe/webhook` |
| 27 | Stripe events | `checkout.session.completed`, `checkout.session.async_payment_failed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| 28 | Customer Portal | Enable in Stripe Dashboard → Settings → Billing → Customer portal |
| 29 | Test end-to-end | Sign up → **Subscribe** in dashboard → Send Test Alert |

### Phase 6 — SEO / AEO / LLMO verification

| # | Task | URL to verify |
|---|------|---------------|
| 28 | Sitemap | `https://yourdomain.com/sitemap.xml` |
| 29 | Robots | `https://yourdomain.com/robots.txt` |
| 30 | LLMO file | `https://yourdomain.com/llms.txt` |
| 31 | Open Graph image | `https://yourdomain.com/opengraph-image` |
| 32 | Google Search Console | Submit sitemap, verify domain |
| 33 | Bing Webmaster Tools | Submit sitemap |
| 34 | Rich Results Test | [Google Rich Results Test](https://search.google.com/test/rich-results) — FAQ + HowTo schema |

---

## Alternative: Deploy to Railway

Railway works well if you prefer a single platform for multiple services later.

1. Create project at [railway.app](https://railway.app)
2. **New → GitHub Repo** → select `vibe-alerts`
3. Railway reads `railway.toml` automatically
4. Set all env vars in Railway dashboard
5. Generate domain or attach custom domain
6. Health check uses `/api/health` (configured in `railway.toml`)

**Railway + Cloudflare:** Same DNS setup — CNAME to Railway's assigned domain.

---

## Vercel vs Railway

| | Vercel | Railway |
|---|--------|---------|
| Next.js optimization | ⭐ Best | Good |
| Edge functions | Native | Limited |
| Setup complexity | Low | Low |
| Pricing (hobby) | Free tier generous | $5/mo credit |
| Health checks | Built-in | `railway.toml` configured |
| **Recommendation** | **Use this** | Good alternative |

---

## Cloudflare + Vercel architecture

```
User browser ──→ Cloudflare (DNS, WAF, CDN) ──→ Vercel (Next.js app)
                                                      ├── /api/v1/webhook/*  (form submissions)
                                                      ├── /api/stripe/webhook  (billing)
                                                      └── /api/health  (uptime monitor)

Website forms ──→ Cloudflare ──→ /api/v1/webhook/{token}  (must bypass cache)
```

---

## SEO files (already implemented)

| File | Purpose |
|------|---------|
| `/sitemap.xml` | Search engine discovery |
| `/robots.txt` | Crawl rules (blocks `/dashboard`, `/login`, `/api/`) |
| `/llms.txt` | LLMO — AI crawler product summary |
| `/llms-full.txt` | Extended machine-readable reference |
| `/opengraph-image` | Dynamic OG image for social sharing |
| JSON-LD on homepage | Organization, WebSite, SoftwareApplication, FAQPage, HowTo |

---

## Post-deploy monitoring

- **Uptime:** Cloudflare Health Checks or UptimeRobot → `GET /api/health`
- **Errors:** Vercel → Logs / Analytics
- **Webhooks:** Dashboard → Activity Feed
- **Stripe:** Dashboard → Webhooks → event log

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 402 on webhooks | Subscription inactive — activate Stripe or SQL |
| 401 on webhooks | Wrong API key header |
| CSRF 403 on dashboard | `NEXT_PUBLIC_APP_URL` must match browser URL exactly |
| Cloudflare 403 on forms | Disable Bot Fight Mode or add WAF exception for `/api/v1/webhook/*` |
| Rate limit 429 | Increase limit in DB or add Upstash |
| OG image broken | Redeploy — `app/opengraph-image.jsx` generates dynamically |
