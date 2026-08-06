/**
 * Uptime probe recording for external monitors and the admin dashboard.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getReadinessStatus } from '@/lib/monitoring/health';
import { logger } from '@/lib/logger';

/**
 * @param {string} [source]
 */
export async function runAndRecordUptimeProbe(source = 'internal') {
  const started = Date.now();
  const readiness = await getReadinessStatus();
  const latencyMs = Date.now() - started;
  const status = readiness.ready ? 'up' : readiness.status === 'degraded' ? 'degraded' : 'down';

  const supabase = createAdminClient();
  const { error } = await supabase.from('uptime_checks').insert({
    status,
    ready: readiness.ready,
    latency_ms: latencyMs,
    checks: readiness.checks,
    source,
  });

  if (error) {
    logger.warn('Failed to persist uptime probe', { error: error.message });
  }

  return {
    status,
    ready: readiness.ready,
    latencyMs,
    service: readiness.service,
    timestamp: readiness.timestamp,
    checks: readiness.checks,
    recorded: !error,
  };
}

/**
 * @param {number} [limit]
 */
export async function getRecentUptimeChecks(limit = 48) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('uptime_checks')
    .select('id, status, ready, latency_ms, source, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('Failed to load uptime checks', { error: error.message });
    return [];
  }

  return data || [];
}

/**
 * Rough availability over the lookback window from stored probes.
 * @param {number} [hours]
 */
export async function getUptimeSummary(hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('uptime_checks')
    .select('status')
    .gte('created_at', since);

  if (error || !data?.length) {
    return { samples: 0, up: 0, degraded: 0, down: 0, availabilityPct: null };
  }

  let up = 0;
  let degraded = 0;
  let down = 0;
  for (const row of data) {
    if (row.status === 'up') up += 1;
    else if (row.status === 'degraded') degraded += 1;
    else down += 1;
  }

  const samples = data.length;
  const availabilityPct = Math.round(((up + degraded * 0.5) / samples) * 1000) / 10;

  return { samples, up, degraded, down, availabilityPct };
}
