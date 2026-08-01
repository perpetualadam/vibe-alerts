import { processWebhookRequest, toNextResponse } from '@/lib/webhook/processor';
import { readBodyWithLimit } from '@/lib/security/body-limit';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Universal webhook receiver — works with any website platform.
 *
 * POST /api/v1/webhook/{webhook_token}
 * Content-Type: application/json
 *
 * Auth: X-VibeAlerts-Key or HMAC signature headers
 */
export async function POST(request, { params }) {
  const { token } = await params;

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return Response.json({ error: 'Invalid webhook token' }, { status: 400 });
  }

  const { webhookMaxPayloadBytes } = getEnv();
  const bodyResult = await readBodyWithLimit(request, webhookMaxPayloadBytes);
  if (!bodyResult.ok) {
    return Response.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const sourceIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const result = await processWebhookRequest({
      token,
      rawBody: bodyResult.rawBody,
      headers: request.headers,
      sourceIp,
    });
    return toNextResponse(result);
  } catch (err) {
    logger.error('Unhandled webhook error', { error: err.message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: 'POST' },
  });
}
