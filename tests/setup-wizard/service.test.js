import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/setup-wizard/db', () => ({
  getWizardProgress: vi.fn(),
  upsertWizardProgress: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/webhook/processor', () => ({
  processWebhookRequest: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getWebhookUrl: (token) => `https://app.test/api/v1/webhook/${token}`,
}));

import { getWizardProgress, upsertWizardProgress } from '@/lib/setup-wizard/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { processWebhookRequest } from '@/lib/webhook/processor';
import {
  completeWizard,
  markWizardStep,
  runWizardConnectionTest,
  selectWizardPlatform,
} from '@/lib/setup-wizard/service';

function mockAdmin({ profile, settings, events = [] }) {
  createAdminClient.mockReturnValue({
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: profile, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: settings, error: null }),
            }),
          }),
        };
      }
      if (table === 'webhook_events') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: () => ({
                  limit: async () => ({ data: events, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  });
}

describe('Integration Wizard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects a platform and resets later checklist steps', async () => {
    upsertWizardProgress.mockResolvedValue({
      platform: 'wordpress',
      steps: {
        platform: true,
        credentials: false,
        instructions: false,
        test: false,
        complete: false,
      },
    });

    const result = await selectWizardPlatform('user-1', 'wordpress');
    expect(result.ok).toBe(true);
    expect(result.guide.label).toBe('WordPress');
    expect(upsertWizardProgress).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        platform: 'wordpress',
        steps: expect.objectContaining({ platform: true, test: false }),
      })
    );
  });

  it('rejects unknown platforms', async () => {
    const result = await selectWizardPlatform('user-1', 'myspace');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('requires credentials before instructions', async () => {
    getWizardProgress.mockResolvedValue({
      platform: 'wix',
      steps: { platform: true, credentials: false },
    });
    const result = await markWizardStep('user-1', 'instructions');
    expect(result.ok).toBe(false);
  });

  it('runs a simulated connection test through the webhook processor', async () => {
    getWizardProgress.mockResolvedValue({
      platform: 'wordpress',
      steps: { platform: true, credentials: true, instructions: true },
    });
    mockAdmin({
      profile: {
        id: 'user-1',
        webhook_token: '11111111-1111-1111-1111-111111111111',
        stripe_subscription_status: 'active',
      },
      settings: { api_key: 'test-key' },
    });
    processWebhookRequest.mockResolvedValue({
      status: 200,
      body: { success: true, eventId: 'evt-1', delivery: [{ channel: 'telegram', success: true }] },
    });
    upsertWizardProgress.mockResolvedValue({
      platform: 'wordpress',
      steps: { test: true },
      lastTestStatus: 'passed',
    });

    const result = await runWizardConnectionTest('user-1', { mode: 'simulate' });
    expect(result.ok).toBe(true);
    expect(processWebhookRequest).toHaveBeenCalled();
    expect(upsertWizardProgress).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        last_test_status: 'passed',
        steps: expect.objectContaining({ test: true }),
      })
    );
  });

  it('blocks complete until the connection test passed', async () => {
    getWizardProgress.mockResolvedValue({
      platform: 'custom',
      steps: { test: false },
      lastTestStatus: null,
    });
    const result = await completeWizard('user-1');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/connection test/i);
  });
});
