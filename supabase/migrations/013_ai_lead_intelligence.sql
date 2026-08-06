-- AI Lead Intelligence: per-tenant settings, durable analysis queue, insights store

CREATE TABLE IF NOT EXISTS public.ai_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  include_in_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_settings_select_own
  ON public.ai_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Mutations go through service role / dashboard API (no direct client writes)
COMMENT ON TABLE public.ai_settings IS
  'Per-tenant AI Lead Intelligence toggles (enable analysis + include in notifications).';

CREATE TABLE IF NOT EXISTS public.lead_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  webhook_event_id UUID NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  spam_score REAL NOT NULL CHECK (spam_score >= 0 AND spam_score <= 100),
  sentiment TEXT NOT NULL,
  estimated_intent TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  raw_response JSONB,
  heuristic_spam_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_insights_event_unique UNIQUE (webhook_event_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_insights_user_created
  ON public.lead_insights(user_id, created_at DESC);

ALTER TABLE public.lead_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_insights_select_own
  ON public.lead_insights FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.lead_insights IS
  'LLM-generated lead analysis for inbound webhook events.';

CREATE TABLE IF NOT EXISTS public.ai_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  webhook_event_id UUID NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notify_after BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  lead_insight_id UUID REFERENCES public.lead_insights(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_queue
  ON public.ai_analysis_jobs(status, next_attempt_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user
  ON public.ai_analysis_jobs(user_id, created_at DESC);

DROP TRIGGER IF EXISTS ai_analysis_jobs_updated_at ON public.ai_analysis_jobs;
CREATE TRIGGER ai_analysis_jobs_updated_at
  BEFORE UPDATE ON public.ai_analysis_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_analysis_jobs_select_own
  ON public.ai_analysis_jobs FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_analysis_jobs IS
  'Durable queue for async AI lead analysis (keeps webhook responses fast).';
