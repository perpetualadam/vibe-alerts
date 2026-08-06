/**
 * Website Integration Wizard service.
 */

import { PLATFORM_HEADER } from '@/lib/integrations/constants';
import { getWebhookUrl } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { processWebhookRequest } from '@/lib/webhook/processor';
import {
  WIZARD_CHECKLIST,
  WIZARD_PLATFORMS,
  getWizardPlatform,
  toIntegrationId,
} from '@/lib/setup-wizard/platforms';
import { getWizardProgress, upsertWizardProgress } from '@/lib/setup-wizard/db';

/**
 * @param {string} userId
 */
export async function getSetupWizardStatus(userId) {
  const progress = await getWizardProgress(userId);
  const supabase = createAdminClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('webhook_token, stripe_subscription_status, email').eq('id', userId).single(),
    supabase.from('user_settings').select('api_key, last_webhook_at').eq('user_id', userId).single(),
  ]);

  const webhookUrl = profile?.webhook_token ? getWebhookUrl(profile.webhook_token) : null;

  return {
    platforms: WIZARD_PLATFORMS.map((p) => ({
      id: p.id,
      integrationId: p.integrationId,
      label: p.label,
      description: p.description,
      blurb: p.blurb,
    })),
    checklist: WIZARD_CHECKLIST,
    progress,
    credentials: {
      webhookUrl,
      apiKey: settings?.api_key ? String(settings.api_key) : null,
      subscriptionActive: profile?.stripe_subscription_status === 'active',
      lastWebhookAt: settings?.last_webhook_at ? String(settings.last_webhook_at) : null,
    },
    guide: progress.platform ? getWizardPlatform(progress.platform) : null,
  };
}

/**
 * Select platform and advance checklist.
 * @param {string} userId
 * @param {string} platformId
 */
export async function selectWizardPlatform(userId, platformId) {
  const platform = getWizardPlatform(platformId);
  if (!platform) {
    return { ok: false, status: 400, error: 'Unknown platform' };
  }

  const progress = await upsertWizardProgress(userId, {
    platform: platform.id,
    steps: {
      platform: true,
      // Changing platform resets later steps
      credentials: false,
      instructions: false,
      test: false,
      complete: false,
    },
    completed_at: null,
    last_test_status: null,
    last_test_at: null,
    last_test_event_id: null,
    last_test_message: null,
  });

  return { ok: true, status: 200, progress, guide: platform };
}

/**
 * Mark a checklist step complete (credentials / instructions).
 * @param {string} userId
 * @param {'credentials'|'instructions'} stepId
 */
export async function markWizardStep(userId, stepId) {
  if (stepId !== 'credentials' && stepId !== 'instructions') {
    return { ok: false, status: 400, error: 'Invalid step' };
  }

  const current = await getWizardProgress(userId);
  if (!current.platform) {
    return { ok: false, status: 400, error: 'Choose a platform first' };
  }
  if (stepId === 'credentials' && !current.steps.platform) {
    return { ok: false, status: 400, error: 'Choose a platform first' };
  }
  if (stepId === 'instructions' && !current.steps.credentials) {
    return { ok: false, status: 400, error: 'Copy your credentials first' };
  }

  const progress = await upsertWizardProgress(userId, {
    steps: { [stepId]: true },
  });

  return { ok: true, status: 200, progress };
}

/**
 * Run an end-to-end connection test through the webhook processor.
 * @param {string} userId
 * @param {{ mode?: 'simulate'|'verify_site' }} [options]
 */
export async function runWizardConnectionTest(userId, options = {}) {
  const mode = options.mode === 'verify_site' ? 'verify_site' : 'simulate';
  const current = await getWizardProgress(userId);
  if (!current.platform) {
    return { ok: false, status: 400, error: 'Choose a platform first' };
  }
  if (!current.steps.credentials) {
    return { ok: false, status: 400, error: 'Copy your credentials before testing' };
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
      error: 'Activate your subscription before testing the connection.',
    };
  }

  const integrationId = toIntegrationId(current.platform);

  if (mode === 'verify_site') {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('id, processing_status, detected_platform, received_payload, created_at, error_message')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) throw error;

    const match = (events || []).find((event) => {
      if (event.processing_status === 'rejected') return false;
      const platform =
        event.detected_platform ||
        event.received_payload?._detected_platform ||
        event.received_payload?._platform ||
        event.received_payload?.source;
      if (platform && String(platform) === integrationId) return true;
      // Accept any successful recent event if platform column missing on older rows
      if (!event.detected_platform && ['completed', 'processing', 'failed'].includes(event.processing_status)) {
        return Boolean(event.received_payload && typeof event.received_payload === 'object');
      }
      return false;
    });

    if (!match) {
      const progress = await upsertWizardProgress(userId, {
        last_test_status: 'failed',
        last_test_at: new Date().toISOString(),
        last_test_event_id: null,
        last_test_message: 'No recent site webhook found in the last 30 minutes.',
        steps: { test: false },
      });
      return {
        ok: false,
        status: 400,
        error:
          'No webhook from your site in the last 30 minutes. Submit a test form, then try again — or use Send test from wizard.',
        progress,
      };
    }

    const progress = await upsertWizardProgress(userId, {
      last_test_status: 'passed',
      last_test_at: new Date().toISOString(),
      last_test_event_id: match.id,
      last_test_message: 'Verified a recent webhook from your site.',
      steps: { test: true, complete: false },
    });

    return {
      ok: true,
      status: 200,
      mode,
      eventId: match.id,
      progress,
      message: 'Connection verified from your site.',
    };
  }

  // Simulate: invoke webhook processor with platform headers + API key
  const payload = {
    name: 'Wizard Test',
    email: 'wizard-test@vibealerts.local',
    message: `Integration wizard test (${current.platform})`,
    source: integrationId,
    _vibealerts_wizard_test: true,
    _platform: integrationId,
  };
  const rawBody = JSON.stringify(payload);
  const headers = new Headers({
    'content-type': 'application/json',
    [PLATFORM_HEADER]: integrationId,
    'x-vibealerts-key': settings.api_key,
  });

  const result = await processWebhookRequest({
    token: profile.webhook_token,
    rawBody,
    headers,
    sourceIp: 'wizard-test',
  });

  const eventId = result.body?.eventId || null;
  const success = result.status >= 200 && result.status < 300;

  if (!success) {
    const message =
      result.body?.error ||
      `Webhook test failed (HTTP ${result.status})`;
    const progress = await upsertWizardProgress(userId, {
      last_test_status: 'failed',
      last_test_at: new Date().toISOString(),
      last_test_event_id: eventId,
      last_test_message: message,
      steps: { test: false },
    });
    return {
      ok: false,
      status: result.status === 402 ? 402 : 400,
      error: message,
      delivery: result.body?.delivery,
      progress,
    };
  }

  const progress = await upsertWizardProgress(userId, {
    last_test_status: 'passed',
    last_test_at: new Date().toISOString(),
    last_test_event_id: eventId,
    last_test_message: 'Wizard test webhook delivered successfully.',
    steps: { test: true, complete: false },
  });

  return {
    ok: true,
    status: 200,
    mode,
    eventId,
    delivery: result.body?.delivery,
    warning: result.body?.warning || null,
    progress,
    message: 'Connection test passed. You can mark the wizard complete.',
  };
}

/**
 * Mark wizard complete — requires a successful connection test.
 * @param {string} userId
 */
export async function completeWizard(userId) {
  const current = await getWizardProgress(userId);
  if (!current.platform) {
    return { ok: false, status: 400, error: 'Choose a platform first' };
  }
  if (!current.steps.test || current.lastTestStatus !== 'passed') {
    return {
      ok: false,
      status: 400,
      error: 'Pass the connection test before marking setup complete.',
    };
  }

  const progress = await upsertWizardProgress(userId, {
    steps: {
      platform: true,
      credentials: true,
      instructions: true,
      test: true,
      complete: true,
    },
    completed_at: new Date().toISOString(),
  });

  return { ok: true, status: 200, progress };
}
