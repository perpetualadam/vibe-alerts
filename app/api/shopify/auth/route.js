import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { beginShopifyInstall } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/**
 * Start Shopify OAuth for a logged-in VibeAlerts user.
 * Query: ?shop=mystore.myshopify.com
 *
 * App Store / Partner install URLs should point here (or /install/shopify).
 */
export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shop = request.nextUrl.searchParams.get('shop') || '';

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `/api/shopify/auth?shop=${encodeURIComponent(shop)}`);
    return NextResponse.redirect(login);
  }

  const result = beginShopifyInstall(user.id, shop);
  if (!result.ok) {
    const url = new URL('/dashboard', request.url);
    url.searchParams.set('shopify_error', result.error || 'Could not start Shopify install');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(result.url);
}
