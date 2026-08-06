import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getWhatsAppStatus } from '@/lib/whatsapp/service';

/** GET WhatsApp Business connection status (never returns access tokens). */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const status = await getWhatsAppStatus(auth.user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load WhatsApp connection status' },
      { status: 500 }
    );
  }
}
