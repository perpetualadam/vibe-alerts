# Automation rules

Per-tenant if/then rules that run on every inbound webhook **after spam scoring** and **before** notification fan-out.

## Examples

| Rule | Behavior |
|------|----------|
| If priority is High, send to WhatsApp and Teams | Restrict delivery to those channels |
| If spam score > 80%, ignore | Drop the submission (custom threshold) |
| If category is Sales, notify the Sales workspace | Deliver only to channels tagged `workspace=Sales` |
| If message contains 'urgent', mark as Critical | Set `priority=Critical` on the payload |

## UI

`/dashboard/rules` — templates, natural-language draft, create/edit/toggle/delete.

## API

- `GET /api/dashboard/rules`
- `POST /api/dashboard/rules` — create, or `{ action: 'parse'|'from_template', ... }`
- `PATCH /api/dashboard/rules/:id`
- `DELETE /api/dashboard/rules/:id`

## Condition types

`field_eq`, `field_neq`, `field_contains`, `field_gt`, `field_gte`, `spam_score_gt`, `spam_score_gte`, `any_field_contains`

## Action types

`notify_channels`, `notify_workspace`, `ignore`, `set_field`, `set_priority`

## Workspace tagging

For `notify_workspace`, set `workspace` (or `destination`) on a channel’s config JSON, e.g. Teams config:

```json
{ "webhook_url": "https://…", "workspace": "Sales" }
```

## Migration

Run `supabase/migrations/012_automation_rules.sql`.
