import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';

/** GET dashboard data: profile, settings, channel configs, activity */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profileRes, settingsRes, eventsRes, logsRes, channelConfigs] = await Promise.all([
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
    webhookEvents: eventsRes.data ?? [],
    notificationLogs: logsRes.data ?? [],
  });
}
