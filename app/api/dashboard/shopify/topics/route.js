import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { updateShopifyTopics } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/**
 * PUT — Update which Shopify events trigger VibeAlerts notifications.
 * Body: { topics: string[] }
 * Re-syncs Admin API webhook subscriptions automatically.
 */
export async function PUT(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const topics = Array.isArray(body.topics) ? body.topics : null;
  if (!topics) {
    return NextResponse.json(
      { error: 'topics must be an array of Shopify webhook topic strings' },
      { status: 400 }
    );
  }

  const result = await updateShopifyTopics(auth.user.id, topics);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ connection: result.connection });
}
