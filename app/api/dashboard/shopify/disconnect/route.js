import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { disconnectShopify } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/** POST — Disconnect Shopify App, remove webhooks, clear encrypted token. */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  try {
    const result = await disconnectShopify(auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
