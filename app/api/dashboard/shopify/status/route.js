import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getShopifyStatusForUser } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/** GET Shopify App connection status (never returns access tokens). */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const status = await getShopifyStatusForUser(auth.user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load Shopify connection status' },
      { status: 500 }
    );
  }
}
