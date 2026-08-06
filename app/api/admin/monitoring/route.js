import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/monitoring/admin';
import { getReadinessStatus } from '@/lib/monitoring/health';
import { isSentryConfigured } from '@/lib/monitoring/sentry';
import { getRetryQueueStats } from '@/lib/notifications/retry-queue';
import { getRecentUptimeChecks, getUptimeSummary } from '@/lib/monitoring/uptime';
import { createAdminClient } from '@/lib/supabase/admin';

/** Platform ops snapshot for the admin monitoring dashboard */
export async function GET(request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const since24h = new Date(Date.now() - 86400000).toISOString();

  const [readiness, queue, uptimeSummary, uptimeRecent, deadLetters, recentFailures, deliveryCounts] =
    await Promise.all([
      getReadinessStatus(),
      getRetryQueueStats(),
      getUptimeSummary(24),
      getRecentUptimeChecks(24),
      supabase
        .from('notification_dead_letters')
        .select(
          'id, channel, error_message, attempt_count, created_at, user_id, notification_log_id'
        )
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(25),
      supabase
        .from('notification_logs')
        .select('id, channel, status, error_message, attempt_count, created_at, user_id')
        .in('status', ['failed', 'dead', 'retrying'])
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('notification_logs')
        .select('status')
        .gte('created_at', since24h),
    ]);

  /** @type {Record<string, number>} */
  const byStatus = {};
  for (const row of deliveryCounts.data || []) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  }

  return NextResponse.json({
    readiness,
    queue,
    uptime: {
      summary: uptimeSummary,
      recent: uptimeRecent,
    },
    deliveriesLast24h: byStatus,
    deadLetters: deadLetters.data || [],
    recentFailures: recentFailures.data || [],
    sentryConfigured: isSentryConfigured(),
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    generatedAt: new Date().toISOString(),
  });
}
