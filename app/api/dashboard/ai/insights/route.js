import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getLeadInsightForEvent, listLeadInsights } from '@/lib/ai';

/** GET recent lead insights, or one by webhook event id */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const eventId = url.searchParams.get('eventId') || url.searchParams.get('webhookEventId');

  try {
    if (eventId) {
      const insight = await getLeadInsightForEvent(auth.user.id, eventId);
      return NextResponse.json({ insight });
    }

    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 25));
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const { rows, total } = await listLeadInsights(auth.user.id, { limit, offset });
    return NextResponse.json({ rows, total, limit, offset });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to load AI insights' },
      { status: 500 }
    );
  }
}
