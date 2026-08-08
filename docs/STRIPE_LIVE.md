# Stripe Live Mode — VibeAlerts

Switch production from **test** to **live** Stripe keys. Test keys stay in `.env.local` for local dev.

**Production site:** https://vibe-alerts.com  
**Webhook URL:** `https://vibe-alerts.com/api/stripe/webhook`

---

## Prerequisites (Dashboard)

Complete these in [Stripe Dashboard](https://dashboard.stripe.com) with **Live mode** toggled on (top-right):

1. **Activate account** — business details, bank account, identity verification.
2. **Public business info** — Settings → Business → Public details:
   - **Website:** `https://vibe-alerts.com`
   - **Support email:** `support@vibe-alerts.com` (forwards to your Gmail via Cloudflare Email Routing)
3. **Customer portal** — Settings → Billing → Customer portal → Activate (cancel at period end, payment method update, invoice history).

Compliance pages are already live: `/pricing`, `/contact`, `/terms`, `/privacy`, `/refunds`.

---

## Step 1 — Create live product & price

In **Live mode** → **Product catalog** → **Add product**:

| Field | Value |
|-------|-------|
| Name | VibeAlerts |
| Description | Website form submissions routed to Telegram, Email, Slack, and more. |
| Pricing | Recurring · Monthly · **$15.00 USD** |

Copy the **Price ID** (`price_...`) — this becomes `STRIPE_PRICE_ID`.

---

## Step 2 — Create live webhook

**Developers** → **Webhooks** → **Add endpoint** (Live mode):

| Field | Value |
|-------|-------|
| Endpoint URL | `https://vibe-alerts.com/api/stripe/webhook` |
| Description | VibeAlerts production billing |

**Events to send:**

- `checkout.session.completed`
- `checkout.session.async_payment_failed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the **Signing secret** (`whsec_...`) — this becomes `STRIPE_WEBHOOK_SECRET`.

---

## Step 3 — API key for production

**Recommended:** Create a [restricted API key](https://dashboard.stripe.com/apikeys) (Live) with:

| Resource | Permission |
|----------|------------|
| Customers | Read |
| Checkout Sessions | Write |
| Billing Portal | Write |
| Prices | Read |
| Subscriptions | Read |

For **one-time setup** (product, webhook, portal config), either use your **secret key** briefly or add temporary Write permissions on Products, Prices, and Webhook Endpoints, then run:

```powershell
cd C:\Users\Brian\OneDrive\Desktop\form-to-telegram
$env:STRIPE_SECRET_KEY = "sk_live_..."   # or rk_live_ with setup permissions
node scripts/stripe-setup.mjs --require-live
```

The script prints `STRIPE_PRICE_ID`, `WEBHOOK_SECRET`, and confirms webhook + portal config.

---

## Step 4 — Vercel production env vars

In [Vercel → vibe-alerts → Settings → Environment Variables](https://vercel.com) (**Production** only):

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | Live secret or restricted key (`sk_live_...` or `rk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Live webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID` | Live price ID (`price_...`) |
| `STRIPE_TRIAL_PERIOD_DAYS` | `14` (optional — default is 14; set `0` to disable free trial) |
| `NEXT_PUBLIC_SUBSCRIPTION_TRIAL_DAYS` | `14` (optional — keeps pricing page copy in sync) |

Keep existing vars unchanged: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUBSCRIPTION_PRICE_LABEL`, Supabase, Telegram, etc.

**Redeploy** production after saving (Vercel → Deployments → Redeploy).

---

## Step 5 — Verify end-to-end

1. Open https://vibe-alerts.com/dashboard (logged in).
2. Click **Unlock Pro Features** (or **Stop Losing Leads** when a trial is enabled) — Checkout should show **live** mode (real card, no “Test mode” banner).
3. Complete payment with a real card (or your own card, then cancel in portal).
4. Dashboard should show subscription **Active**.
5. Stripe → **Developers → Webhooks** → your endpoint → confirm **200** responses on events.

---

## Local vs production

| Environment | Keys |
|-------------|------|
| `.env.local` | Keep **test** keys (`rk_test_...`, test `price_...`, test `whsec_...`) |
| Vercel Production | **Live** keys only |

Never commit `.env.local`. Test and live price IDs are different — do not copy test `STRIPE_PRICE_ID` to production.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Checkout says “Test mode” | Production still has `sk_test_` / `rk_test_` — update Vercel and redeploy |
| Webhook 400 / signature failed | `STRIPE_WEBHOOK_SECRET` must match the **live** endpoint secret, not test |
| `STRIPE_PRICE_ID is not configured` | Set live `STRIPE_PRICE_ID` in Vercel Production |
| Subscribe works but status stays inactive | Check webhook logs in Stripe; ensure Cloudflare cache bypasses `/api/*` |
| RAK “does not have required permissions” | Add Write on Checkout Sessions + Billing Portal; use secret key for setup script |
