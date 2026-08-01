import { getHealthStatus } from '@/lib/health';

/** Health check for deployment platforms and uptime monitors */
export async function GET() {
  return Response.json(getHealthStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
