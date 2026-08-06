import { NextResponse } from 'next/server';
import { upsertChannelConfig } from '@/lib/channel-configs/db';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { disconnectWhatsAppAccount } from '@/lib/whatsapp/service';

/**
 * POST — Disconnect the authenticated user's WhatsApp Business account.
 * Clears encrypted credentials and marks the channel disconnected (keeps recipient phone).
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const result = await disconnectWhatsAppAccount(auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const { data: existing } = await auth.supabase
      .from('channel_configs')
      .select('config, enabled')
      .eq('user_id', auth.user.id)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    if (existing) {
      const phone = String(existing.config?.phone ?? '').replace(/\D/g, '');
      const row = await upsertChannelConfig(auth.supabase, {
        userId: auth.user.id,
        channel: 'whatsapp',
        config: {
          ...(phone ? { phone } : {}),
          whatsapp_connected: false,
        },
        enabled: false,
        connectedAt: null,
        touchConnectedAt: false,
      });

      return NextResponse.json({
        connection: result.connection,
        channel: {
          channel: row.channel,
          config: row.config,
          enabled: row.enabled,
          connected_at: row.connected_at,
        },
      });
    }
  } catch {
    // Secrets cleared; channel sync is best-effort
  }

  return NextResponse.json({ connection: result.connection, channel: null });
}
