import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import {
  getAiPlatformStatus,
  getAiSettings,
  upsertAiSettings,
} from '@/lib/ai';

/** GET AI settings + platform provider status */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const [settings, platform] = await Promise.all([
      getAiSettings(auth.user.id),
      Promise.resolve(getAiPlatformStatus()),
    ]);
    return NextResponse.json({ settings, platform });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to load AI settings' },
      { status: 500 }
    );
  }
}

/** PATCH enable/disable AI and notification inclusion */
export async function PATCH(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const settings = await upsertAiSettings(auth.user.id, {
      enabled: body.enabled,
      includeInNotifications:
        body.includeInNotifications ?? body.include_in_notifications,
    });
    return NextResponse.json({
      settings,
      platform: getAiPlatformStatus(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to update AI settings' },
      { status: 500 }
    );
  }
}
