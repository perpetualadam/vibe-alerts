import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { subscribePush } from '@/lib/push/service';

export const runtime = 'nodejs';

/** POST — save a browser PushSubscription for the authenticated user. */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await subscribePush(
    auth.user.id,
    body,
    request.headers.get('user-agent') || undefined
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ subscription: result.subscription });
}
