-- Plugin-oriented channel configuration table
-- Replaces user_settings.channel_configs JSONB and profiles.telegram_chat_id

CREATE TABLE IF NOT EXISTS public.channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_channel_configs_user_id ON public.channel_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_configs_channel ON public.channel_configs(channel);

DROP TRIGGER IF EXISTS channel_configs_updated_at ON public.channel_configs;
CREATE TRIGGER channel_configs_updated_at
  BEFORE UPDATE ON public.channel_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migrate Telegram chat IDs from profiles
INSERT INTO public.channel_configs (user_id, channel, config, enabled, connected_at)
SELECT
  p.id,
  'telegram',
  jsonb_build_object('chat_id', p.telegram_chat_id),
  true,
  NOW()
FROM public.profiles p
WHERE p.telegram_chat_id IS NOT NULL
ON CONFLICT (user_id, channel) DO UPDATE
SET config = EXCLUDED.config,
    enabled = true,
    connected_at = COALESCE(public.channel_configs.connected_at, EXCLUDED.connected_at);

-- Migrate JSONB blob from user_settings (if column exists from migration 002)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'channel_configs'
  ) THEN
    INSERT INTO public.channel_configs (user_id, channel, config, enabled, connected_at)
    SELECT
      us.user_id,
      ch.key,
      ch.value,
      COALESCE(us.enabled_channels @> ARRAY[ch.key], false),
      CASE WHEN ch.key = 'telegram' THEN us.telegram_connected_at ELSE NULL END
    FROM public.user_settings us
    CROSS JOIN LATERAL jsonb_each(us.channel_configs) AS ch(key, value)
    WHERE us.channel_configs IS NOT NULL AND us.channel_configs != '{}'::jsonb
    ON CONFLICT (user_id, channel) DO UPDATE
    SET config = public.channel_configs.config || EXCLUDED.config,
        enabled = public.channel_configs.enabled OR EXCLUDED.enabled;
  END IF;
END $$;

-- Default telegram enabled for users without any channel row
INSERT INTO public.channel_configs (user_id, channel, enabled)
SELECT p.id, 'telegram', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.channel_configs cc WHERE cc.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.channel_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own channel configs"
  ON public.channel_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channel configs"
  ON public.channel_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channel configs"
  ON public.channel_configs FOR UPDATE
  USING (auth.uid() = user_id);

-- Drop deprecated columns (safe — data migrated above)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS telegram_chat_id;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS channel_configs;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS enabled_channels;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS telegram_connected_at;

-- Remove channel CHECK on notification_logs for future plugins
ALTER TABLE public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_channel_check;

-- Update signup trigger: seed default telegram channel
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.channel_configs (user_id, channel, enabled)
  VALUES (NEW.id, 'telegram', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.channel_configs IS
  'Per-tenant notification plugin configuration. One row per user per channel.';
