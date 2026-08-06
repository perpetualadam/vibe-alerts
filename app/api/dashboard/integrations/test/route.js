import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { sendIntegrationTestNotification } from '@/lib/integrations/send-test';

/** POST — Send Test Notification for a website platform integration */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const platform = String(body?.platform || '').trim();
  const result = await sendIntegrationTestNotification(auth.user.id, platform);

  return Response.json(
    {
      success: result.ok,
      error: result.error,
      message: result.message,
      eventId: result.eventId,
      delivery: result.delivery,
      warning: result.warning,
      platform: result.platform,
    },
    { status: result.status }
  );
}
