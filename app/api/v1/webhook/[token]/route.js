import { processWebhookRequest, toNextResponse } from '@/lib/webhook/processor';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Universal webhook receiver — works with any website platform.
 *
 * Integration examples:
 * - WordPress: use a webhook plugin pointing POST JSON here
 * - Wix: Automations → Custom Webhook
 * - Webflow: form submission webhook
 * - HTML forms: fetch() from your site or use a form backend
 *
 * Required headers (choose one auth method):
 * - HMAC: X-VibeAlerts-Signature + X-VibeAlerts-Timestamp
 * - API Key: X-VibeAlerts-Key
 *
 * POST /api/v1/webhook/{webhook_token}
 * Content-Type: application/json
 */
export async function POST(request, { params }) {
  const { token } = await params;

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return Response.json({ error: 'Invalid webhook token' }, { status: 400 });
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch (err) {
    logger.error('Failed to read request body', { error: err.message });
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const sourceIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const result = await processWebhookRequest({
      token,
      rawBody,
      headers: request.headers,
      sourceIp,
    });
    return toNextResponse(result);
  } catch (err) {
    logger.error('Unhandled webhook error', { error: err.message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Reject non-POST methods */
export async function GET() {
  return Response.json(
    {
      service: 'VibeAlerts Webhook',
      method: 'POST',
      contentType: 'application/json',
      docs: 'https://vibe-alerts.com/docs/webhook',
    },
    { status: 405 }
  );
}
