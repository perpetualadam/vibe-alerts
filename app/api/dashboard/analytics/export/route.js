import { buildAnalyticsCsv } from '@/lib/analytics/csv';
import {
  fetchAnalyticsDashboard,
  parseAnalyticsFilters,
} from '@/lib/analytics/queries';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * GET — Export analytics snapshot as CSV.
 * Query: from, to, provider
 */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const filters = parseAnalyticsFilters(new URL(request.url).searchParams);

  try {
    const analytics = await fetchAnalyticsDashboard(
      auth.supabase,
      auth.user.id,
      filters
    );
    const csv = buildAnalyticsCsv(analytics);
    const stamp = filters.fromIso.slice(0, 10);
    const filename = `vibealerts-analytics-${stamp}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'Failed to export analytics' }, { status: 500 });
  }
}
