import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { beginShopifyInstall } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/**
 * POST — Return the Shopify OAuth URL for one-click install.
 * Body: { shop: "mystore.myshopify.com" }
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

  const shop = typeof body.shop === 'string' ? body.shop : '';
  const result = beginShopifyInstall(auth.user.id, shop);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    authUrl: result.url,
    shopDomain: result.shop,
  });
}
