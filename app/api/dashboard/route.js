import { NextResponse } from 'next/server';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getWhatsAppStatus } from '@/lib/whatsapp/service';

/** GET dashboard data: profile, settings, channel configs, activity */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const { user, supabase } = auth;
  const [profileRes, settingsRes, eventsRes, logsRes, channelConfigs, whatsappStatus] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      supabase
        .from('webhook_events')
        .select('id, processing_status, error_message, delivery_summary, created_at, received_payload')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('notification_logs')
        .select('id, channel, status, error_message, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      fetchChannelConfigs(supabase, user.id),
      getWhatsAppStatus(user.id).catch(() => ({
        platformReady: false,
        encryptionReady: false,
        connection: { connected: false },
      })),
    ]);

  return NextResponse.json({
    profile: profileRes.data,
    settings: settingsRes.data
      ? {
          ...settingsRes.data,
          webhook_secret: undefined,
          api_key: undefined,
        }
      : null,
    channelConfigs,
    whatsapp: whatsappStatus,
    webhookEvents: eventsRes.data ?? [],
    notificationLogs: logsRes.data ?? [],
  });
}
