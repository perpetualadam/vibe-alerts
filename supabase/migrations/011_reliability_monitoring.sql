-- Reliability & monitoring: async retries, DLQ, platform admin

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- Allow dead-letter status on notification logs
ALTER TABLE public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_status_check;
ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'retrying', 'dead'));

CREATE INDEX IF NOT EXISTS idx_notification_logs_retry_queue
  ON public.notification_logs(next_retry_at)
  WHERE status = 'retrying';

CREATE INDEX IF NOT EXISTS idx_notification_logs_dead
  ON public.notification_logs(created_at DESC)
  WHERE status = 'dead';

-- Dead letter queue for exhausted deliveries
CREATE TABLE IF NOT EXISTS public.notification_dead_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_log_id UUID REFERENCES public.notification_logs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  webhook_event_id UUID REFERENCES public.webhook_events(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  payload_preview TEXT,
  error_message TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_dlq_unresolved
  ON public.notification_dead_letters(created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.notification_dead_letters ENABLE ROW LEVEL SECURITY;
-- Service-role only for platform ops (no anon/authenticated policies)

COMMENT ON TABLE public.notification_dead_letters IS
  'Exhausted notification deliveries for admin inspection and manual replay.';

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'Platform operator flag for /dashboard/admin monitoring (not tenant billing admin).';

-- Uptime probe history for admin monitoring + external monitors
CREATE TABLE IF NOT EXISTS public.uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('up', 'degraded', 'down')),
  ready BOOLEAN NOT NULL DEFAULT false,
  latency_ms INT,
  checks JSONB,
  source TEXT NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uptime_checks_created
  ON public.uptime_checks(created_at DESC);

ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.uptime_checks IS
  'Periodic readiness probes for uptime monitoring dashboards.';
