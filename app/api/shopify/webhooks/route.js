import { processShopifyWebhook } from '@/lib/shopify/service';

export const runtime = 'nodejs';

/**
 * Unified Shopify Admin webhook endpoint.
 * HMAC-verified; topics subscribed automatically on install / topic sync.
 */
export async function POST(request) {
  const rawBody = await request.text();
  const result = await processShopifyWebhook({
    rawBody,
    headers: request.headers,
  });

  return Response.json(result.body, { status: result.status });
}
