import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { sendWhatsAppTestMessage } from '@/lib/whatsapp/service';

/**
 * POST — Send a WhatsApp Cloud API test message using the tenant's connected account.
 * Body: { phone?, message? } — phone defaults to saved channel recipient.
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let phone = String(body.phone ?? '').replace(/\D/g, '');
  if (!phone) {
    const { data: existing } = await auth.supabase
      .from('channel_configs')
      .select('config')
      .eq('user_id', auth.user.id)
      .eq('channel', 'whatsapp')
      .maybeSingle();
    phone = String(existing?.config?.phone ?? '').replace(/\D/g, '');
  }

  const result = await sendWhatsAppTestMessage({
    userId: auth.user.id,
    to: phone,
    message: body.message
      ? String(body.message).slice(0, 4096)
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, retryable: result.retryable ?? false },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    connection: result.connection,
    source: result.source,
  });
}
