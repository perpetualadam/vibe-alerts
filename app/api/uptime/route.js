import { runAndRecordUptimeProbe } from '@/lib/monitoring/uptime';

/**
 * Uptime monitoring endpoint — runs readiness, records a sample, returns status.
 * Point UptimeRobot / Better Stack / Cronitor at this URL (or /api/health/ready).
 */
export async function GET(request) {
  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'external';
  const record = url.searchParams.get('record') !== '0';

  if (!record) {
    const { getReadinessStatus } = await import('@/lib/monitoring/health');
    const readiness = await getReadinessStatus();
    return Response.json(
      {
        status: readiness.ready ? 'up' : 'degraded',
        ready: readiness.ready,
        service: readiness.service,
        timestamp: readiness.timestamp,
        checks: readiness.checks,
        recorded: false,
      },
      {
        status: readiness.ready ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  const probe = await runAndRecordUptimeProbe(source);
  return Response.json(probe, {
    status: probe.ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
