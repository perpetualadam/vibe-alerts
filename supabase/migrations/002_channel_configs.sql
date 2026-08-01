-- Add per-channel configuration and generic delivery summary

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS channel_configs JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS delivery_summary JSONB;

COMMENT ON COLUMN public.user_settings.channel_configs IS
  'Per-channel config: email.to, whatsapp.phone, slack.webhook_url, teams.webhook_url';
