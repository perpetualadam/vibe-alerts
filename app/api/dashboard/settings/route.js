import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getPlugin, validatePluginConfig } from '@/lib/notifications';
import { upsertChannelConfig } from '@/lib/channel-configs/db';

/**
 * PATCH notification plugin settings.
 * Body: { channel, enabled?, config? }
 */
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { channel, enabled, config } = body;

  if (!channel || typeof channel !== 'string') {
    return NextResponse.json({ error: 'channel is required' }, { status: 400 });
  }

  const plugin = getPlugin(channel);
  if (!plugin) {
    return NextResponse.json({ error: `Unknown channel: ${channel}` }, { status: 400 });
  }

  // Load existing row to merge config
  const { data: existing } = await supabase
    .from('channel_configs')
    .select('config, enabled')
    .eq('user_id', user.id)
    .eq('channel', channel)
    .maybeSingle();

  const nextEnabled = enabled !== undefined ? Boolean(enabled) : (existing?.enabled ?? false);
  const mergedConfig = config !== undefined
    ? { ...(existing?.config ?? {}), ...config }
    : (existing?.config ?? {});

  // Validate config when provided and channel is enabled with non-empty config
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
  const sanitizedConfig = validation.config ?? mergedConfig;

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
