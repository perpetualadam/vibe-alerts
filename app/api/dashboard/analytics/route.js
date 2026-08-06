import { NextResponse } from 'next/server';
import {
  fetchAnalyticsDashboard,
  parseAnalyticsFilters,
} from '@/lib/analytics/queries';
import { getPluginCatalog } from '@/lib/notifications';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * GET — Analytics dashboard payload (RPC-backed aggregations).
 * Query: from, to, provider
 */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const filters = parseAnalyticsFilters(new URL(request.url).searchParams);

  try {
    const [analytics, catalog] = await Promise.all([
      fetchAnalyticsDashboard(auth.supabase, auth.user.id, filters),
      Promise.resolve(getPluginCatalog()),
    ]);

    return NextResponse.json({
      ...analytics,
      providers: catalog.map((p) => ({ id: p.id, label: p.label })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
