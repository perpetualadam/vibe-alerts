import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getPushStatus } from '@/lib/push/service';

export const runtime = 'nodejs';

/** GET Web Push status + VAPID public key (never returns private key). */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const status = await getPushStatus(auth.user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: 'Failed to load push status' }, { status: 500 });
  }
}
