-- Billing enhancements: plan metadata, usage metering, team billing

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_interval TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_billing_plan
  ON public.profiles(billing_plan);

-- Teams (shared subscription / seats)
CREATE TABLE IF NOT EXISTS public.billing_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  billing_plan TEXT NOT NULL DEFAULT 'free',
  billing_interval TEXT,
  stripe_subscription_status TEXT NOT NULL DEFAULT 'inactive',
  seat_limit INT NOT NULL DEFAULT 3,
  webhook_limit_monthly INT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_teams_owner
  ON public.billing_teams(owner_user_id);

DROP TRIGGER IF EXISTS billing_teams_updated_at ON public.billing_teams;
CREATE TRIGGER billing_teams_updated_at
  BEFORE UPDATE ON public.billing_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.billing_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.billing_teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  invite_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id),
  UNIQUE (team_id, invited_email)
);

CREATE INDEX IF NOT EXISTS idx_billing_team_members_user
  ON public.billing_team_members(user_id)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS billing_team_members_updated_at ON public.billing_team_members;
CREATE TRIGGER billing_team_members_updated_at
  BEFORE UPDATE ON public.billing_team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_team_members ENABLE ROW LEVEL SECURITY;

-- Monthly webhook usage for plan limits / metering
CREATE TABLE IF NOT EXISTS public.billing_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.billing_teams(id) ON DELETE SET NULL,
  period_ym TEXT NOT NULL,
  webhook_count INT NOT NULL DEFAULT 0,
  overage_reported INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_ym)
);

CREATE INDEX IF NOT EXISTS idx_billing_usage_period
  ON public.billing_usage_monthly(period_ym);

ALTER TABLE public.billing_usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_usage_select_own
  ON public.billing_usage_monthly FOR SELECT
  USING (auth.uid() = user_id);

-- Team RLS: members can read their team
CREATE POLICY billing_teams_select_member
  ON public.billing_teams FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.billing_team_members m
      WHERE m.team_id = billing_teams.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY billing_team_members_select_member
  ON public.billing_team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.billing_teams t
      WHERE t.id = billing_team_members.team_id
        AND t.owner_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.billing_teams IS
  'Shared Stripe subscription for team billing (owner pays; members share entitlement).';
COMMENT ON TABLE public.billing_usage_monthly IS
  'Per-tenant monthly webhook counters for plan limits and optional overage metering.';

-- Extend profile column protection for new billing fields (service role bypasses RLS/triggers as needed)
CREATE OR REPLACE FUNCTION public.protect_profiles_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stripe_subscription_status IS DISTINCT FROM OLD.stripe_subscription_status THEN
    RAISE EXCEPTION 'Cannot modify stripe_subscription_status';
  END IF;
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_customer_id';
  END IF;
  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_subscription_id';
  END IF;
  IF NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_price_id';
  END IF;
  IF NEW.billing_plan IS DISTINCT FROM OLD.billing_plan THEN
    RAISE EXCEPTION 'Cannot modify billing_plan';
  END IF;
  IF NEW.billing_interval IS DISTINCT FROM OLD.billing_interval THEN
    RAISE EXCEPTION 'Cannot modify billing_interval';
  END IF;
  RETURN NEW;
END;
$$;
