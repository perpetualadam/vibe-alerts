/**
 * Core webhook processing pipeline.
 * Decoupled from HTTP layer and notification providers for testability and queue migration.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookRequest } from '@/lib/webhook/auth';
import { parseAndValidatePayload } from '@/lib/webhook/validation';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { notificationService } from '@/lib/notifications/service';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { detectSpam } from '@/lib/spam/detect';
import { logger } from '@/lib/logger';

export async function processWebhookRequest({ token, rawBody, headers, sourceIp }) {
  const supabase = createAdminClient();

  // 1. Lookup tenant by webhook token
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('webhook_token', token)
    .single();

  if (profileError || !profile) {
    logger.warn('Webhook token not found', { token: token?.slice(0, 8) });
    return jsonResponse(404, { error: 'Webhook endpoint not found' });
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  const channelConfigs = await fetchChannelConfigs(supabase, profile.id);

  // 2. Subscription gate
  if (profile.stripe_subscription_status !== 'active') {
    await logWebhookEvent(supabase, {
      userId: profile.id,
      webhookToken: token,
      payload: {},
      status: 'rejected',
      error: 'Subscription inactive',
      sourceIp,
      signatureValid: null,
    });
    return jsonResponse(402, { error: 'Payment required. Please activate your subscription.' });
  }

  // 3. Verify request authenticity before rate limiting (prevents unauthenticated DoS)
  const authResult = verifyWebhookRequest({
    headers,
    rawBody,
    webhookSecret: settings?.webhook_secret,
    apiKey: settings?.api_key,
  });

  if (!authResult.valid) {
    await logWebhookEvent(supabase, {
      userId: profile.id,
      webhookToken: token,
      payload: {},
      status: 'rejected',
      error: 'Authentication failed',
      sourceIp,
      signatureValid: false,
    });
    return jsonResponse(401, { error: 'Unauthorized webhook request' });
  }

  // 4. Rate limiting (authenticated requests only)
  const rateLimit = await checkRateLimit(
    profile.id,
    settings?.rate_limit_per_minute ?? 60
  );

  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      { error: 'Rate limit exceeded. Please try again later.' },
      rateLimitHeaders(rateLimit, settings?.rate_limit_per_minute ?? 60)
    );
  }

  // 5. Platform-aware normalize + validate payload
  const normalized = parseAndNormalizeBody(rawBody, headers);
  if (!normalized.ok) {
    await logWebhookEvent(supabase, {
      userId: profile.id,
      webhookToken: token,
      payload: {},
      status: 'rejected',
      error: normalized.error,
      sourceIp,
      signatureValid: true,
    });
    return jsonResponse(normalized.status, { error: normalized.error });
  }

  const parsed = parseAndValidatePayload(normalized.body, settings?.max_payload_bytes);
  if (!parsed.ok) {
    await logWebhookEvent(supabase, {
      userId: profile.id,
      webhookToken: token,
      payload: {},
      status: 'rejected',
      error: parsed.error,
      sourceIp,
      signatureValid: true,
    });
    return jsonResponse(parsed.status, { error: parsed.error });
  }

  // 6. Spam heuristics (scored for analytics; flagged submissions are not delivered)
  const spam = detectSpam(parsed.data);

  // 7. Log incoming event
  const event = await logWebhookEvent(supabase, {
    userId: profile.id,
    webhookToken: token,
    payload: {
      ...parsed.data,
      ...(normalized.platform ? { _detected_platform: normalized.platform } : {}),
    },
    status: spam.flagged ? 'rejected' : 'processing',
    error: spam.flagged ? 'Spam detected' : null,
    sourceIp,
    signatureValid: true,
    detectedPlatform: normalized.platform,
    spamScore: spam.score,
    spamFlagged: spam.flagged,
    spamSignals: spam.signals,
  });

  if (spam.flagged) {
    logger.info('Webhook rejected as spam', {
      userId: profile.id,
      score: spam.score,
      signals: spam.signals,
    });
    return jsonResponse(422, { error: 'Submission rejected' });
  }

  // 8. Fan-out via NotificationService — never call providers from the webhook layer
  //    Webhook → NotificationService → every enabled & configured provider
  let deliveryResults;
  try {
    deliveryResults = await notificationService.notify({
      userId: profile.id,
      profile,
      settings,
      channelConfigs,
      payload: parsed.data,
      webhookEventId: event?.id,
    });
  } catch (err) {
    logger.error('Notification delivery failed', { error: err.message, userId: profile.id });
    await updateWebhookEvent(supabase, event?.id, {
      processing_status: 'failed',
      error_message: 'Notification delivery error',
    });
    return jsonResponse(502, { error: 'Failed to deliver notification. Event logged for retry.' });
  }

  const anySuccess = deliveryResults.some((r) => r.success);
  const deliverySummary = deliveryResults.map((r) => ({
    channel: r.channel,
    success: r.success,
    error: r.error ?? null,
  }));

  // 9. Update event status
  await updateWebhookEvent(supabase, event?.id, {
    processing_status: anySuccess ? 'completed' : 'failed',
    delivery_summary: deliverySummary,
    error_message: anySuccess
      ? null
      : deliveryResults.map((r) => r.error).filter(Boolean).join('; ') || 'All channels failed',
  });

  // 10. Update last webhook timestamp
  await supabase
    .from('user_settings')
    .update({ last_webhook_at: new Date().toISOString() })
    .eq('user_id', profile.id);

  if (!anySuccess) {
    return jsonResponse(502, {
      error: 'Notification delivery failed. Your lead has been logged.',
      eventId: event?.id,
      delivery: deliverySummary,
    });
  }

  const failures = deliverySummary.filter((entry) => !entry.success);
  logger.info('Webhook processed', { userId: profile.id, eventId: event?.id });

  return jsonResponse(
    200,
    {
      success: true,
      eventId: event?.id,
      delivery: deliverySummary,
      ...(failures.length
        ? { warning: `${failures.length} channel(s) failed. See notification history for details.` }
        : {}),
    },
    rateLimitHeaders(rateLimit, settings?.rate_limit_per_minute ?? 60)
  );
}

async function logWebhookEvent(supabase, {
  userId,
  webhookToken,
  payload,
  status,
  error,
  sourceIp,
  signatureValid,
  detectedPlatform = null,
  spamScore = null,
  spamFlagged = false,
  spamSignals = null,
}) {
  const row = {
    user_id: userId,
    webhook_token: webhookToken,
    received_payload: payload,
    processing_status: status,
    error_message: error ?? null,
    source_ip: sourceIp ?? null,
    request_signature_valid: signatureValid,
    detected_platform: detectedPlatform ?? payload?._detected_platform ?? null,
    spam_score: spamScore,
    spam_flagged: Boolean(spamFlagged),
    spam_signals: spamSignals ?? [],
  };

  const { data, error: dbError } = await supabase
    .from('webhook_events')
    .insert(row)
    .select('id')
    .single();

  // Older DBs without migration 007: retry without spam/platform columns
  if (dbError && /spam_|detected_platform/i.test(dbError.message || '')) {
    const {
      detected_platform: _p,
      spam_score: _s,
      spam_flagged: _f,
      spam_signals: _g,
      ...legacy
    } = row;
    const retry = await supabase.from('webhook_events').insert(legacy).select('id').single();
    if (retry.error) logger.error('Failed to log webhook event', { error: retry.error.message });
    return retry.data;
  }

  if (dbError) logger.error('Failed to log webhook event', { error: dbError.message });
  return data;
}

async function updateWebhookEvent(supabase, eventId, updates) {
  if (!eventId) return;
  await supabase.from('webhook_events').update(updates).eq('id', eventId);
}

function jsonResponse(status, body, extraHeaders = {}) {
  return {
    status,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  };
}

export function toNextResponse(result) {
  return Response.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
