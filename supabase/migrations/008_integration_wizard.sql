-- Website Integration Wizard progress (per-tenant)

CREATE TABLE IF NOT EXISTS public.integration_wizard_progress (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT,
  steps JSONB NOT NULL DEFAULT '{
    "platform": false,
    "credentials": false,
    "instructions": false,
    "test": false,
    "complete": false
  }'::jsonb,
  last_test_status TEXT,
  last_test_at TIMESTAMPTZ,
  last_test_event_id UUID,
  last_test_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS integration_wizard_progress_updated_at ON public.integration_wizard_progress;
CREATE TRIGGER integration_wizard_progress_updated_at
  BEFORE UPDATE ON public.integration_wizard_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.integration_wizard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_wizard_progress_select_own
  ON public.integration_wizard_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY integration_wizard_progress_insert_own
  ON public.integration_wizard_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY integration_wizard_progress_update_own
  ON public.integration_wizard_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.integration_wizard_progress IS
  'Website Integration Wizard checklist progress per tenant.';
