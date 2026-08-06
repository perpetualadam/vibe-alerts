import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_PROVIDER_ORDER,
  formatDeliveryDuration,
  isProviderConnected,
  resolveNotificationSource,
} from '@/lib/notifications/history';

describe('notification history helpers', () => {
  it('orders core dashboard providers first', () => {
    expect(DASHBOARD_PROVIDER_ORDER).toEqual([
      'telegram',
      'discord',
      'email',
      'teams',
      'whatsapp',
      'slack',
    ]);
  });

  it('formats delivery duration', () => {
    const start = '2026-01-01T00:00:00.000Z';
    expect(formatDeliveryDuration(start, '2026-01-01T00:00:00.250Z')).toBe('250ms');
    expect(formatDeliveryDuration(start, '2026-01-01T00:00:02.000Z')).toBe('2.0s');
    expect(formatDeliveryDuration(start, null)).toBeNull();
  });

  it('resolves notification sources', () => {
    expect(resolveNotificationSource({ webhook_event_id: null })).toBe('Dashboard test');
    expect(
      resolveNotificationSource({
        webhook_event_id: 'evt-1',
        webhook_events: { received_payload: { _detected_platform: 'wordpress' } },
      })
    ).toBe('wordpress');
    expect(
      resolveNotificationSource({
        webhook_event_id: 'evt-2',
        webhook_events: { received_payload: {} },
      })
    ).toBe('Webhook');
  });

  it('detects connected providers from config / WhatsApp status', () => {
    const telegram = {
      id: 'telegram',
      platformReady: true,
      configSchema: [{ key: 'chat_id', required: true }],
    };
    expect(
      isProviderConnected(telegram, { config: { chat_id: '123' } }, null)
    ).toBe(true);
    expect(isProviderConnected(telegram, { config: {} }, null)).toBe(false);

    const whatsapp = {
      id: 'whatsapp',
      platformReady: true,
      configSchema: [{ key: 'phone', required: true }],
    };
    expect(
      isProviderConnected(
        whatsapp,
        { config: { phone: '15551234567' } },
        { connection: { connected: true } }
      )
    ).toBe(true);
    expect(
      isProviderConnected(
        whatsapp,
        { config: { phone: '15551234567' } },
        { connection: { connected: false } }
      )
    ).toBe(false);
  });
});
