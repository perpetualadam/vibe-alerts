# AI Lead Intelligence

LLM-agnostic lead analysis for every inbound webhook.

## Outputs

| Field | Description |
|-------|-------------|
| Lead Summary | 1–2 sentence plain-English summary |
| Category | e.g. Sales, Support, Partnership |
| Priority | `Low` \| `Medium` \| `High` |
| Spam Score | 0–100 |
| Sentiment | Positive / Neutral / Negative / Mixed |
| Estimated Intent | Short phrase for what the lead wants |

## Architecture

```
Webhook → validate/spam → enqueue ai_analysis_jobs → HTTP 200 (fast)
                              ↓
                     after() + cron worker
                              ↓
              LLM provider (Groq/OpenAI/Anthropic/Grok)
                              ↓
                   lead_insights (+ optional notify)
```

- **Queue:** `ai_analysis_jobs` (durable, retry with backoff)
- **Immediate path:** `next/server` `after()` when available
- **Backup:** Vercel Cron `GET /api/cron/ai-analysis` every minute (`CRON_SECRET`)
- **Providers:** pluggable `LlmProvider` interface in TypeScript (`lib/ai/providers/*`)

## Customer controls

`/dashboard/ai`

- **Enable AI analysis** — per-tenant on/off (`ai_settings.enabled`)
- **Include AI summary in notifications** — when on, alerts wait for analysis and include `ai_*` fields; when off, alerts send immediately and insights stay in the dashboard

## Platform env

```bash
# Pick one (or let auto-detect prefer Groq → OpenAI → Anthropic → Grok)
AI_PROVIDER=groq

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest

XAI_API_KEY=
XAI_MODEL=grok-2-latest

CRON_SECRET=
```

## Migration

Run `supabase/migrations/013_ai_lead_intelligence.sql`.

## APIs

- `GET/PATCH /api/dashboard/ai/settings`
- `GET /api/dashboard/ai/insights`
- `GET /api/cron/ai-analysis`
