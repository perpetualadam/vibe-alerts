import { getReadinessStatus } from '@/lib/monitoring/health';

/** Deep readiness probe for load balancers and uptime monitors */
export async function GET() {
  const readiness = await getReadinessStatus();
  return Response.json(readiness, {
    status: readiness.ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
