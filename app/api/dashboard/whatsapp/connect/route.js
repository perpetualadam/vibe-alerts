import { NextResponse } from 'next/server';
import { upsertChannelConfig } from '@/lib/channel-configs/db';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { connectWhatsAppAccount } from '@/lib/whatsapp/service';

/**
 * POST — Connect the authenticated user's WhatsApp Business account.
 * Body: { wabaId, phoneNumberId, accessToken, phone? }
 * Verifies credentials with Meta Cloud API, encrypts the access token, stores connection.
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await connectWhatsAppAccount({
    userId: auth.user.id,
    input: body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Keep channel_configs in sync: mark connected + optional recipient phone; do not store tokens.
  try {
    const { data: existing } = await auth.supabase
      .from('channel_configs')
      .select('config, enabled')
      .eq('user_id', auth.user.id)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    const prevConfig = existing?.config ?? {};
    const phone =
      result.recipientPhone ||
      String(prevConfig.phone ?? body.phone ?? '').replace(/\D/g, '');

    const config = {
      phone: phone || undefined,
      whatsapp_connected: true,
    };
    // Drop undefined phone so we don't clear an existing value incorrectly
    if (!config.phone) {
      if (prevConfig.phone) config.phone = String(prevConfig.phone).replace(/\D/g, '');
      else delete config.phone;
    }

    const row = await upsertChannelConfig(auth.supabase, {
      userId: auth.user.id,
      channel: 'whatsapp',
      config,
      enabled: existing?.enabled ?? Boolean(config.phone),
    });

    return NextResponse.json({
      connection: result.connection,
      channel: {
        channel: row.channel,
        config: {
          phone: row.config?.phone ?? null,
          whatsapp_connected: true,
        },
        enabled: row.enabled,
        connected_at: row.connected_at,
      },
    });
  } catch {
    // Connection secrets were saved; channel sync failure is non-fatal
    return NextResponse.json({
      connection: result.connection,
      channel: null,
      warning: 'Connected, but failed to sync channel settings. Re-save the WhatsApp channel.',
    });
  }
}
