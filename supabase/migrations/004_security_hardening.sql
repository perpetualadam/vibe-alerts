-- Security hardening: protect sensitive columns from authenticated user tampering
-- Service role (API routes) bypasses these guards.

-- =============================================================================
-- profiles: block user updates to billing/token/email fields
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profiles_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.stripe_subscription_status IS DISTINCT FROM OLD.stripe_subscription_status THEN
      RAISE EXCEPTION 'Forbidden: cannot modify subscription status';
    END IF;
    IF NEW.webhook_token IS DISTINCT FROM OLD.webhook_token THEN
      RAISE EXCEPTION 'Forbidden: cannot modify webhook token';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Forbidden: cannot modify email';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profiles_before_update ON public.profiles;
CREATE TRIGGER protect_profiles_before_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_columns();

-- =============================================================================
-- user_settings: block user updates to secrets and server-enforced limits
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_user_settings_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id THEN
    IF NEW.webhook_secret IS DISTINCT FROM OLD.webhook_secret THEN
      RAISE EXCEPTION 'Forbidden: cannot modify webhook secret';
    END IF;
    IF NEW.api_key IS DISTINCT FROM OLD.api_key THEN
      RAISE EXCEPTION 'Forbidden: cannot modify API key';
    END IF;
    IF NEW.rate_limit_per_minute IS DISTINCT FROM OLD.rate_limit_per_minute THEN
      RAISE EXCEPTION 'Forbidden: cannot modify rate limit';
    END IF;
    IF NEW.max_payload_bytes IS DISTINCT FROM OLD.max_payload_bytes THEN
      RAISE EXCEPTION 'Forbidden: cannot modify payload limit';
    END IF;
    IF NEW.webhook_token_rotated_at IS DISTINCT FROM OLD.webhook_token_rotated_at THEN
      RAISE EXCEPTION 'Forbidden: cannot modify rotation timestamp';
    END IF;
    IF NEW.last_webhook_at IS DISTINCT FROM OLD.last_webhook_at THEN
      RAISE EXCEPTION 'Forbidden: cannot modify last webhook timestamp';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_user_settings_before_update ON public.user_settings;
CREATE TRIGGER protect_user_settings_before_update
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_settings_columns();

-- Remove direct user UPDATE on profiles (settings go through API / service role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Remove direct user UPDATE on user_settings (all changes via authenticated API routes)
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;

-- =============================================================================
-- Stripe webhook idempotency (prevent duplicate event processing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events(processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No user policies — service role only

COMMENT ON TABLE public.stripe_webhook_events IS
  'Processed Stripe webhook event IDs for idempotency. Service role access only.';
