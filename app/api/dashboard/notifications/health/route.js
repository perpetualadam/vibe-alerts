import { NextResponse } from 'next/server';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { notificationService } from '@/lib/notifications';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * GET — provider HealthCheck() for the authenticated tenant.
 * Goes through NotificationService (never calls providers from the route directly).
 */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const channelConfigs = await fetchChannelConfigs(auth.supabase, auth.user.id);
    const providers = await notificationService.healthCheck({
      userId: auth.user.id,
      channelConfigs,
    });

    const healthyCount = providers.filter((p) => p.healthy).length;

    return NextResponse.json({
      healthy: healthyCount > 0,
      providers,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to run notification health checks' },
      { status: 500 }
    );
  }
}
