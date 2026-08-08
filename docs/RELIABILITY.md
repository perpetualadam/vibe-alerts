# Reliability & monitoring

## Health checks

| Endpoint | Purpose | Status codes |
|----------|---------|--------------|
| `GET /api/health` | Liveness (process up) | 200 |
| `GET /api/health/ready` | Readiness (Supabase, Redis, config) | 200 ready / 503 degraded |
| `GET /api/uptime` | Readiness + persist probe for dashboards | 200 / 503 |

Point external uptime monitors at `/api/health/ready` or `/api/uptime?source=uptimerobot`.

## Delivery retries

1. **Sync backoff** — up to 2 in-request attempts (`500ms`, `1500ms`) for retryable provider errors.
2. **Durable queue** — failed retryable deliveries set `notification_logs.status = 'retrying'` with `next_retry_at`.
3. **Exponential backoff** — 60s × 2^(n-1), capped at 1 hour (max 5 async attempts).
4. **Dead letter** — exhausted jobs move to `notification_dead_letters` (`status = 'dead'`).

Cron endpoint: `GET /api/cron/retries` with `Authorization: Bearer $CRON_SECRET`.

> **Vercel Hobby:** Native Vercel Cron is omitted from `vercel.json` so Hobby deploys succeed. Hit this endpoint from an external scheduler (or add a daily/`*/N` cron in `vercel.json` after upgrading to Vercel Pro). The in-request retry backoff still runs without cron.

## Error tracking

- Structured JSON logs via `lib/logger.js` (`LOG_LEVEL`).
- Optional Sentry: set `SENTRY_DSN` (initialized from `instrumentation.js`).

## Admin dashboard

`/dashboard/admin` — platform operators only.

Access via:

- `PLATFORM_ADMIN_EMAILS=you@company.com,oncall@company.com`, or
- `profiles.is_platform_admin = true`

APIs: `GET /api/admin/monitoring`, `GET|POST /api/admin/dlq`, `GET /api/admin/me`.

## Migration

Run `supabase/migrations/011_reliability_monitoring.sql`.
