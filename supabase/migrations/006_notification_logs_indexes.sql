-- Speed up notification history filters and per-provider last success/fail lookups

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_created
  ON public.notification_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_channel_created
  ON public.notification_logs(user_id, channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_status_created
  ON public.notification_logs(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_channel_status_created
  ON public.notification_logs(user_id, channel, status, created_at DESC);
