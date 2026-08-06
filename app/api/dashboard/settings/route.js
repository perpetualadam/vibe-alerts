import { NextResponse } from 'next/server';
import { getPlugin, validatePluginConfig } from '@/lib/notifications';
import { upsertChannelConfig } from '@/lib/channel-configs/db';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * PATCH notification plugin settings.
 * Body: { channel, enabled?, config? }
 */
export async function PATCH(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const { user, supabase } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { channel, enabled, config } = body;

  if (!channel || typeof channel !== 'string') {
    return NextResponse.json({ error: 'channel is required' }, { status: 400 });
  }

  const plugin = getPlugin(channel);
  if (!plugin) {
    return NextResponse.json({ error: `Unknown channel: ${channel}` }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('channel_configs')
    .select('config, enabled')
    .eq('user_id', user.id)
    .eq('channel', channel)
    .maybeSingle();

  const nextEnabled = enabled !== undefined ? Boolean(enabled) : (existing?.enabled ?? false);
  const mergedConfig =
    config !== undefined
      ? { ...(existing?.config ?? {}), ...config }
      : (existing?.config ?? {});

  // Never accept WhatsApp secrets through the generic settings endpoint.
  if (channel === 'whatsapp') {
    delete mergedConfig.access_token;
    delete mergedConfig.accessToken;
    delete mergedConfig.waba_id;
    delete mergedConfig.wabaId;
    delete mergedConfig.phone_number_id;
    delete mergedConfig.phoneNumberId;
    if (existing?.config?.whatsapp_connected != null && mergedConfig.whatsapp_connected == null) {
      mergedConfig.whatsapp_connected = existing.config.whatsapp_connected;
    }
  }

  if (config !== undefined && nextEnabled) {
    const hasValues = Object.values(mergedConfig).some((v) => String(v ?? '').trim());
    if (hasValues) {
      const validation = validatePluginConfig(channel, mergedConfig);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }
  }

  const validation = validatePluginConfig(channel, mergedConfig);
  const sanitizedConfig = {
    ...(validation.config ?? mergedConfig),
    ...(channel === 'whatsapp' && mergedConfig.whatsapp_connected != null
      ? { whatsapp_connected: Boolean(mergedConfig.whatsapp_connected) }
      : {}),
  };

  try {
    const row = await upsertChannelConfig(supabase, {
      userId: user.id,
      channel,
      config: sanitizedConfig,
      enabled: nextEnabled,
    });

    return NextResponse.json({
      channel: row.channel,
      config: row.config,
      enabled: row.enabled,
      connected_at: row.connected_at,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save channel settings' }, { status: 500 });
  }
}
