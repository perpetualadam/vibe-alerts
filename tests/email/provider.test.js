import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { EmailProvider } from '@/lib/notifications/providers/email';

describe('EmailProvider Cloudflare / Resend coexistence', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  });

  it('includes reply_to support address for routed support mail', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 'alerts@vibe-alerts.com';
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'support@vibe-alerts.com';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new EmailProvider();
    const result = await provider.send({
      channelConfigs: {
        email: { enabled: true, config: { to: 'owner@example.com' } },
      },
      payload: { name: 'Jane', message: 'Hello' },
    });

    expect(result.success).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe('alerts@vibe-alerts.com');
    expect(body.to).toEqual(['owner@example.com']);
    expect(body.reply_to).toBe('support@vibe-alerts.com');
  });

  it('surfaces SPF / domain guidance when Resend rejects the from domain', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 'alerts@vibe-alerts.com';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          message: 'The vibe-alerts.com domain is not verified.',
        }),
      })
    );

    const provider = new EmailProvider();
    const result = await provider.send({
      channelConfigs: {
        email: { enabled: true, config: { to: 'owner@example.com' } },
      },
      payload: { email: 'lead@example.com' },
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/domain is not verified/i);
    expect(result.error).toMatch(/Email Routing/i);
    expect(result.error).toMatch(/include:resend.com/i);
  });
});
