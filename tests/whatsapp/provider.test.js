import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/whatsapp/service', () => ({
  sendWhatsAppAlert: vi.fn(),
  sendWhatsAppTestMessage: vi.fn(),
  isWhatsAppPlatformReady: vi.fn(() => true),
}));

import { WhatsAppProvider } from '@/lib/notifications/providers/whatsapp';
import { sendWhatsAppAlert } from '@/lib/whatsapp/service';

describe('WhatsAppProvider notification plugin', () => {
  const previousKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  const previousToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const previousPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CREDENTIALS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = previousKey;
    if (previousToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = previousToken;
    if (previousPhone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = previousPhone;
  });

  it('requires recipient phone and connected flag for tenant setup', () => {
    const provider = new WhatsAppProvider();
    expect(
      provider.isConfigured({
        channelConfigs: {
          whatsapp: { enabled: true, config: { phone: '15551234567' } },
        },
      })
    ).toBe(false);

    expect(
      provider.isConfigured({
        channelConfigs: {
          whatsapp: {
            enabled: true,
            config: { phone: '15551234567', whatsapp_connected: true },
          },
        },
      })
    ).toBe(true);
  });

  it('delegates send to the WhatsApp service with tenant user id', async () => {
    sendWhatsAppAlert.mockResolvedValue({ success: true, response: { messages: [] } });
    const provider = new WhatsAppProvider();
    const result = await provider.send({
      userId: 'user-42',
      channelConfigs: {
        whatsapp: {
          enabled: true,
          config: { phone: '15551234567', whatsapp_connected: true },
        },
      },
      payload: { Name: 'Ada', Message: 'Hello' },
    });

    expect(result.success).toBe(true);
    expect(sendWhatsAppAlert).toHaveBeenCalledWith({
      userId: 'user-42',
      to: '15551234567',
      body: expect.stringContaining('Ada'),
    });
  });

  it('can be disabled independently of other channels', () => {
    const provider = new WhatsAppProvider();
    expect(
      provider.isConfigured({
        channelConfigs: {
          whatsapp: {
            enabled: false,
            config: { phone: '15551234567', whatsapp_connected: true },
          },
          telegram: { enabled: true, config: { chat_id: '1' } },
        },
      })
    ).toBe(false);
  });
});
