-- Analytics: spam scoring columns, platform column, composite indexes, aggregate RPCs
-- All RPCs use auth.uid() and run aggregations in Postgres (no full-table client scans).

-- =============================================================================
-- Schema extensions for analytics / spam
-- =============================================================================
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS detected_platform TEXT,
  ADD COLUMN IF NOT EXISTS spam_score REAL,
  ADD COLUMN IF NOT EXISTS spam_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spam_signals JSONB;

COMMENT ON COLUMN public.webhook_events.detected_platform IS
  'Normalized source platform id (wordpress, wix, …) denormalized for analytics indexes';
COMMENT ON COLUMN public.webhook_events.spam_score IS
  'Heuristic spam score 0–1 from lib/spam/detect';
COMMENT ON COLUMN public.webhook_events.spam_flagged IS
  'True when submission was classified as spam and not delivered';

-- Backfill platform from existing payloads (best-effort)
UPDATE public.webhook_events
SET detected_platform = NULLIF(received_payload->>'_detected_platform', '')
WHERE detected_platform IS NULL
  AND received_payload ? '_detected_platform';

-- =============================================================================
-- Indexes for large-tenant analytics windows
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_created
  ON public.webhook_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_status_created
  ON public.webhook_events(user_id, processing_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_platform_created
  ON public.webhook_events(user_id, detected_platform, created_at DESC)
  WHERE detected_platform IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_spam_created
  ON public.webhook_events(user_id, spam_flagged, created_at DESC)
  WHERE spam_flagged = true;

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_completed
  ON public.notification_logs(user_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- =============================================================================
-- RPC: overview metrics
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_overview(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_provider TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  v_total_webhooks BIGINT;
  v_notifications_sent BIGINT;
  v_successful BIGINT;
  v_failed BIGINT;
  v_avg_ms DOUBLE PRECISION;
  v_active_providers BIGINT;
  v_top_channel TEXT;
  v_spam_total BIGINT;
  v_spam_flagged BIGINT;
  v_spam_avg DOUBLE PRECISION;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*) INTO v_total_webhooks
  FROM public.webhook_events we
  WHERE we.user_id = uid
    AND we.created_at >= p_from
    AND we.created_at <= p_to;

  SELECT
    COUNT(*) FILTER (WHERE nl.status IN ('sent', 'failed', 'retrying', 'pending')),
    COUNT(*) FILTER (WHERE nl.status = 'sent'),
    COUNT(*) FILTER (WHERE nl.status = 'failed'),
    AVG(EXTRACT(EPOCH FROM (nl.completed_at - nl.created_at)) * 1000)
      FILTER (WHERE nl.status = 'sent' AND nl.completed_at IS NOT NULL)
  INTO v_notifications_sent, v_successful, v_failed, v_avg_ms
  FROM public.notification_logs nl
  WHERE nl.user_id = uid
    AND nl.created_at >= p_from
    AND nl.created_at <= p_to
    AND (p_provider IS NULL OR p_provider = '' OR p_provider = 'all' OR nl.channel = p_provider);

  SELECT COUNT(DISTINCT cc.channel) INTO v_active_providers
  FROM public.channel_configs cc
  WHERE cc.user_id = uid AND cc.enabled = true;

  SELECT nl.channel INTO v_top_channel
  FROM public.notification_logs nl
  WHERE nl.user_id = uid
    AND nl.created_at >= p_from
    AND nl.created_at <= p_to
    AND nl.status = 'sent'
    AND (p_provider IS NULL OR p_provider = '' OR p_provider = 'all' OR nl.channel = p_provider)
  GROUP BY nl.channel
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE we.spam_flagged),
    AVG(we.spam_score) FILTER (WHERE we.spam_score IS NOT NULL)
  INTO v_spam_total, v_spam_flagged, v_spam_avg
  FROM public.webhook_events we
  WHERE we.user_id = uid
    AND we.created_at >= p_from
    AND we.created_at <= p_to;

  RETURN jsonb_build_object(
    'totalWebhooks', COALESCE(v_total_webhooks, 0),
    'notificationsSent', COALESCE(v_notifications_sent, 0),
    'successfulDeliveries', COALESCE(v_successful, 0),
    'failedDeliveries', COALESCE(v_failed, 0),
    'averageDeliveryTimeMs', ROUND(COALESCE(v_avg_ms, 0)::numeric, 1),
    'activeProviders', COALESCE(v_active_providers, 0),
    'topChannel', v_top_channel,
    'spam', jsonb_build_object(
      'scanned', COALESCE(v_spam_total, 0),
      'flagged', COALESCE(v_spam_flagged, 0),
      'averageScore', ROUND(COALESCE(v_spam_avg, 0)::numeric, 3)
    )
  );
END;
$$;

-- =============================================================================
-- RPC: daily usage series
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_daily_usage(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_provider TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day)
    FROM (
      SELECT
        to_char(day, 'YYYY-MM-DD') AS day,
        COALESCE(w.webhooks, 0) AS webhooks,
        COALESCE(n.sent, 0) AS sent,
        COALESCE(n.failed, 0) AS failed
      FROM generate_series(
        date_trunc('day', p_from AT TIME ZONE 'UTC'),
        date_trunc('day', p_to AT TIME ZONE 'UTC'),
        INTERVAL '1 day'
      ) AS day
      LEFT JOIN (
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS d, COUNT(*)::int AS webhooks
        FROM public.webhook_events
        WHERE user_id = uid AND created_at >= p_from AND created_at <= p_to
        GROUP BY 1
      ) w ON w.d = day
      LEFT JOIN (
        SELECT
          date_trunc('day', created_at AT TIME ZONE 'UTC') AS d,
          COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
        FROM public.notification_logs
        WHERE user_id = uid
          AND created_at >= p_from
          AND created_at <= p_to
          AND (p_provider IS NULL OR p_provider = '' OR p_provider = 'all' OR channel = p_provider)
        GROUP BY 1
      ) n ON n.d = day
    ) t
  ), '[]'::jsonb);
END;
$$;

-- =============================================================================
-- RPC: monthly usage series
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_monthly_usage(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_provider TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.month)
    FROM (
      SELECT
        to_char(month, 'YYYY-MM') AS month,
        COALESCE(w.webhooks, 0) AS webhooks,
        COALESCE(n.sent, 0) AS sent,
        COALESCE(n.failed, 0) AS failed
      FROM generate_series(
        date_trunc('month', p_from AT TIME ZONE 'UTC'),
        date_trunc('month', p_to AT TIME ZONE 'UTC'),
        INTERVAL '1 month'
      ) AS month
      LEFT JOIN (
        SELECT date_trunc('month', created_at AT TIME ZONE 'UTC') AS m, COUNT(*)::int AS webhooks
        FROM public.webhook_events
        WHERE user_id = uid AND created_at >= p_from AND created_at <= p_to
        GROUP BY 1
      ) w ON w.m = month
      LEFT JOIN (
        SELECT
          date_trunc('month', created_at AT TIME ZONE 'UTC') AS m,
          COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
        FROM public.notification_logs
        WHERE user_id = uid
          AND created_at >= p_from
          AND created_at <= p_to
          AND (p_provider IS NULL OR p_provider = '' OR p_provider = 'all' OR channel = p_provider)
        GROUP BY 1
      ) n ON n.m = month
    ) t
  ), '[]'::jsonb);
END;
$$;

-- =============================================================================
-- RPC: most active sources
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_top_sources(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_limit INT DEFAULT 8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb)
    FROM (
      SELECT
        COALESCE(NULLIF(detected_platform, ''), 'webhook') AS source,
        COUNT(*)::int AS count
      FROM public.webhook_events
      WHERE user_id = uid
        AND created_at >= p_from
        AND created_at <= p_to
        AND processing_status IN ('completed', 'failed', 'processing', 'pending')
      GROUP BY 1
      ORDER BY COUNT(*) DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 50))
    ) t
  ), '[]'::jsonb);
END;
$$;

-- =============================================================================
-- RPC: channel breakdown
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_channel_breakdown(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_provider TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb)
    FROM (
      SELECT
        channel AS provider,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        ROUND(
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000)
              FILTER (WHERE status = 'sent' AND completed_at IS NOT NULL),
            0
          )::numeric,
          1
        ) AS avgDeliveryMs
      FROM public.notification_logs
      WHERE user_id = uid
        AND created_at >= p_from
        AND created_at <= p_to
        AND (p_provider IS NULL OR p_provider = '' OR p_provider = 'all' OR channel = p_provider)
      GROUP BY channel
      ORDER BY COUNT(*) DESC
    ) t
  ), '[]'::jsonb);
END;
$$;

-- =============================================================================
-- RPC: spam statistics
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_spam_stats(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'scanned', COALESCE(COUNT(*), 0),
      'flagged', COALESCE(COUNT(*) FILTER (WHERE spam_flagged), 0),
      'clean', COALESCE(COUNT(*) FILTER (WHERE NOT spam_flagged), 0),
      'averageScore', ROUND(COALESCE(AVG(spam_score) FILTER (WHERE spam_score IS NOT NULL), 0)::numeric, 3),
      'flagRate', ROUND(
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE (COUNT(*) FILTER (WHERE spam_flagged))::numeric / COUNT(*)::numeric
        END,
        4
      ),
      'daily', COALESCE((
        SELECT jsonb_agg(row_to_json(d)::jsonb ORDER BY d.day)
        FROM (
          SELECT
            to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS scanned,
            COUNT(*) FILTER (WHERE spam_flagged)::int AS flagged
          FROM public.webhook_events
          WHERE user_id = uid
            AND created_at >= p_from
            AND created_at <= p_to
          GROUP BY 1
          ORDER BY 1
        ) d
      ), '[]'::jsonb),
      'topSignals', COALESCE((
        SELECT jsonb_agg(row_to_json(s)::jsonb)
        FROM (
          SELECT signal AS name, COUNT(*)::int AS count
          FROM public.webhook_events we,
               LATERAL jsonb_array_elements_text(COALESCE(we.spam_signals, '[]'::jsonb)) AS signal
          WHERE we.user_id = uid
            AND we.created_at >= p_from
            AND we.created_at <= p_to
            AND we.spam_flagged = true
          GROUP BY signal
          ORDER BY COUNT(*) DESC
          LIMIT 10
        ) s
      ), '[]'::jsonb)
    )
    FROM public.webhook_events
    WHERE user_id = uid
      AND created_at >= p_from
      AND created_at <= p_to
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_daily_usage(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_monthly_usage(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_sources(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_channel_breakdown(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_spam_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
