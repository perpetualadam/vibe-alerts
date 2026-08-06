import { NextResponse } from 'next/server';
import { fetchNotificationHistory } from '@/lib/notifications/history';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * GET — Filtered notification history.
 * Query: provider, outcome (success|failure|all), from, to, limit, offset
 */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);

  try {
    const result = await fetchNotificationHistory(auth.supabase, auth.user.id, {
      provider: searchParams.get('provider') || 'all',
      outcome: searchParams.get('outcome') || searchParams.get('status') || 'all',
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      limit: searchParams.get('limit') || 25,
      offset: searchParams.get('offset') || 0,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load notification history' },
      { status: 500 }
    );
  }
}
