import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { sendPushToUser } from '@/lib/push/service';

export const runtime = 'nodejs';

/** POST — send a test Web Push to the user's registered devices. */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const result = await sendPushToUser(auth.user.id, {
    title: 'VibeAlerts test',
    body: 'Push notifications are working on this device.',
    url: '/dashboard/notifications',
    tag: 'vibealerts-test',
  });

  if (result.skipped) {
    return NextResponse.json(
      { error: 'Web Push is not configured on this deployment.' },
      { status: 503 }
    );
  }

  if (result.sent === 0) {
    return NextResponse.json(
      { error: 'No push subscriptions on this account. Enable push on a device first.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    message: `Test push sent to ${result.sent} device(s)`,
  });
}
