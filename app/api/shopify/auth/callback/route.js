import { NextResponse } from 'next/server';
import { completeShopifyInstall } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/**
 * Shopify OAuth callback — exchanges code, stores offline token, registers webhooks.
 */
export async function GET(request) {
  const result = await completeShopifyInstall(request.nextUrl.searchParams);

  if (!result.ok) {
    const url = new URL('/dashboard', request.url);
    url.searchParams.set('shopify_error', result.error || 'Shopify install failed');
    return NextResponse.redirect(url);
  }

  const url = new URL('/dashboard', request.url);
  url.searchParams.set('shopify', 'connected');
  url.searchParams.set('shop', result.shop);
  return NextResponse.redirect(url);
}
