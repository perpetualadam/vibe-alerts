# Billing enhancements

VibeAlerts billing is Stripe Checkout + Customer Portal with:

| Feature | Implementation |
|---------|----------------|
| Monthly & annual | Starter + Pro prices (`STRIPE_PRICE_*`) |
| Free trial | `STRIPE_TRIAL_PERIOD_DAYS` (default 14) |
| Usage limits | Per-plan webhook quotas; Starter hard-stops; Pro allows overage |
| Usage metering | Optional Stripe Billing Meter via `STRIPE_METER_EVENT_NAME` |
| Promo codes | Checkout `allow_promotion_codes` + optional `promoCode` field |
| Customer Portal | `/api/stripe/portal` — invoices, PM update, plan changes, cancel |
| Invoices | Listed in `/dashboard/billing` + Portal hosted invoices/PDFs |
| Team billing | `billing_teams` + invites; owner pays, members share entitlement |
| Upgrade/downgrade | In-app prorated `change-plan` API + Portal subscription update |

## Setup

1. Run migration `010_billing_enhancements.sql`
2. `npm run stripe:setup` (creates products/prices/webhook/portal)
3. Copy printed `STRIPE_PRICE_*` env vars to Vercel
4. Create Coupons / Promotion Codes in Stripe Dashboard for promos
5. (Optional) Create a Billing Meter and set `STRIPE_METER_EVENT_NAME` for Pro overage

## Dashboard

`/dashboard/billing` — plans, usage meter, promo field, invoices, team seats, portal links.

## Key APIs

- `POST /api/stripe/checkout` `{ plan, interval, promoCode?, teamId? }`
- `POST /api/stripe/portal` `{ flow?: 'subscription_update'|'payment_method_update' }`
- `GET /api/dashboard/billing`
- `POST /api/dashboard/billing/change-plan`
- `GET /api/dashboard/billing/invoices`
- `POST /api/dashboard/billing/team` `{ action: create|invite|accept }`
