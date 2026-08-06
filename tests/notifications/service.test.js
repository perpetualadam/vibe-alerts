import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'log-1' }, error: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  }),
}));

vi.mock('@/lib/whatsapp/db', () => ({
  getWhatsAppConnectionPublic: vi.fn(async () => ({ connected: false })),
}));

import { NotificationProvider } from '@/lib/notifications/providers/base';
import { NotificationService } from '@/lib/notifications/service';
import { registerPlugin, getPlugin } from '@/lib/notifications/registry';

class FakeProvider extends NotificationProvider {
  static id = 'fake_notify_svc';
  static label = 'Fake';
  static configSchema = [{ key: 'dest', label: 'Dest', required: true }];

  constructor() {
    super();
    this.sendCalls = 0;
    this.testCalls = 0;
    this.healthCalls = 0;
  }

  validateConfig(config) {
    const dest = String(config.dest ?? '').trim();
    if (!dest) return { valid: false, error: 'dest required' };
    return { valid: true, config: { dest } };
  }

  async send(context) {
    this.sendCalls += 1;
    return { success: true, response: { via: 'send', payload: context.payload } };
  }

  async test(context) {
    this.testCalls += 1;
    return { success: true, response: { via: 'test', payload: context.payload } };
  }

  async healthCheck(context) {
    this.healthCalls += 1;
    return super.healthCheck(context);
  }
}

describe('NotificationService', () => {
  /** @type {FakeProvider} */
  let fake;
  /** @type {NotificationService} */
  let service;

  beforeEach(() => {
    fake = new FakeProvider();
    registerPlugin({
      id: FakeProvider.id,
      version: '1.0.0',
      label: FakeProvider.label,
      description: 'test double',
      configSchema: FakeProvider.configSchema,
      setupGuide: [],
      provider: fake,
    });
    service = new NotificationService();
  });

  it('fans out notify() to every enabled & configured provider', async () => {
    const results = await service.notify({
      userId: 'user-1',
      profile: {},
      settings: {},
      channelConfigs: {
        fake_notify_svc: { enabled: true, config: { dest: 'x' } },
      },
      payload: { Name: 'Ada' },
    });

    expect(fake.sendCalls).toBe(1);
    expect(fake.testCalls).toBe(0);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ channel: 'fake_notify_svc', success: true });
  });

  it('uses provider.test() when NotificationService.test() is called', async () => {
    const results = await service.test({
      userId: 'user-1',
      profile: {},
      settings: {},
      channelConfigs: {
        fake_notify_svc: { enabled: true, config: { dest: 'x' } },
      },
    });

    expect(fake.testCalls).toBe(1);
    expect(fake.sendCalls).toBe(0);
    expect(results[0].success).toBe(true);
  });

  it('skips providers that are enabled but not configured', async () => {
    const results = await service.notify({
      userId: 'user-1',
      profile: {},
      settings: {},
      channelConfigs: {
        fake_notify_svc: { enabled: true, config: {} },
      },
      payload: { Name: 'Ada' },
    });

    expect(fake.sendCalls).toBe(0);
    expect(results[0]).toMatchObject({
      channel: 'none',
      success: false,
      error: 'No channels configured',
    });
  });

  it('runs healthCheck across providers', async () => {
    const results = await service.healthCheck({
      userId: 'user-1',
      channelConfigs: {
        fake_notify_svc: { enabled: true, config: { dest: 'x' } },
      },
      providerIds: ['fake_notify_svc'],
    });

    expect(fake.healthCalls).toBe(1);
    expect(results[0]).toMatchObject({
      provider: 'fake_notify_svc',
      healthy: true,
    });
  });

  it('exposes getProvider without letting webhook import concrete providers', () => {
    expect(service.getProvider('fake_notify_svc')).toBe(fake);
    expect(getPlugin('fake_notify_svc')?.provider).toBe(fake);
  });
});
