-- Customer automation rules (if/then routing for inbound webhooks)

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  stop_processing BOOLEAN NOT NULL DEFAULT false,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_rules_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT automation_rules_priority_range CHECK (priority BETWEEN 0 AND 10000)
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user_priority
  ON public.automation_rules(user_id, enabled, priority);

DROP TRIGGER IF EXISTS automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_rules_select_own
  ON public.automation_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY automation_rules_insert_own
  ON public.automation_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY automation_rules_update_own
  ON public.automation_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY automation_rules_delete_own
  ON public.automation_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Track which rules ran on an event (ops / debugging)
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS rules_applied JSONB;

COMMENT ON TABLE public.automation_rules IS
  'Per-tenant if/then automation rules for webhook routing and enrichment.';

COMMENT ON COLUMN public.webhook_events.rules_applied IS
  'Automation rules matched/applied during processing (ids, actions, ignore).';
