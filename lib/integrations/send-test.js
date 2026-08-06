/**
 * Send a platform-shaped test webhook through the real delivery pipeline.
 * Used by the dashboard "Send Test Notification" control.
 */

import { PLATFORM_HEADER } from '@/lib/integrations/constants';
import { getPlatform } from '@/lib/integrations/registry';
import { buildIntegrationTestPayload } from '@/lib/integrations/test-payloads';
import { processWebhookRequest } from '@/lib/webhook/processor';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * @param {string} userId
 * @param {string} platformId
 */
export async function sendIntegrationTestNotification(userId, platformId) {
  if (!platformId || typeof platformId !== 'string') {
    return { ok: false, status: 400, error: 'platform is required' };
  }

  const adapter = getPlatform(platformId);
  if (!adapter) {
    return { ok: false, status: 400, error: 'Unknown platform integration' };
  }

  const supabase = createAdminClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
  ]);

  if (!profile?.webhook_token || !settings?.api_key) {
    return { ok: false, status: 404, error: 'Account not fully configured' };
  }

  if (profile.stripe_subscription_status !== 'active') {
    return {
      ok: false,
      status: 402,
      error: 'Activate your subscription before sending a test notification.',
    };
  }

  const payload = buildIntegrationTestPayload(platformId);
  const rawBody = JSON.stringify(payload);
  const headers = new Headers({
    'content-type': 'application/json',
    [PLATFORM_HEADER]: platformId,
    'x-vibealerts-key': settings.api_key,
  });

  logger.info('Sending integration test notification', { userId, platformId });

  const result = await processWebhookRequest({
    token: profile.webhook_token,
    rawBody,
    headers,
    sourceIp: 'integration-test',
  });

  const eventId = result.body?.eventId || null;
  const success = result.status >= 200 && result.status < 300;

  if (!success) {
    return {
      ok: false,
      status: result.status === 402 ? 402 : 400,
      error: result.body?.error || `Test notification failed (HTTP ${result.status})`,
      eventId,
      delivery: result.body?.delivery,
      platform: platformId,
    };
  }

  return {
    ok: true,
    status: 200,
    message: `Test notification sent via ${adapter.constructor.label || platformId}`,
    eventId,
    delivery: result.body?.delivery,
    warning: result.body?.warning || null,
    platform: platformId,
  };
}
