import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/whatsapp/db', () => ({
  getWhatsAppConnectionPublic: vi.fn(),
  getWhatsAppCredentials: vi.fn(),
  upsertWhatsAppConnection: vi.fn(),
  disconnectWhatsAppConnection: vi.fn(),
  markWhatsAppMessageSuccess: vi.fn(),
}));

vi.mock('@/lib/whatsapp/client', () => ({
  verifyWhatsAppCredentials: vi.fn(),
  sendWhatsAppTextMessage: vi.fn(),
}));

import {
  connectWhatsAppAccount,
  isWhatsAppPlatformReady,
  normalizeWhatsAppConnectInput,
  sendWhatsAppTestMessage,
} from '@/lib/whatsapp/service';
import {
  getWhatsAppConnectionPublic,
  getWhatsAppCredentials,
  markWhatsAppMessageSuccess,
  upsertWhatsAppConnection,
} from '@/lib/whatsapp/db';
import {
  sendWhatsAppTextMessage,
  verifyWhatsAppCredentials,
} from '@/lib/whatsapp/client';

describe('WhatsAppProviderService', () => {
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

  it('is platform ready when encryption key is configured', () => {
    expect(isWhatsAppPlatformReady()).toBe(true);
  });

  it('normalizes and validates connect input', () => {
    expect(
      normalizeWhatsAppConnectInput({
        wabaId: '123',
        phoneNumberId: '456',
        accessToken: 'short',
      }).valid
    ).toBe(false);

    const ok = normalizeWhatsAppConnectInput({
      waba_id: '102290129340398',
      phone_number_id: '106540352242922',
      access_token: 'EAAabcdefghijklmnopqr1234567890',
      phone: '+1 (555) 123-4567',
    });
    expect(ok.valid).toBe(true);
    expect(ok.recipientPhone).toBe('15551234567');
  });

  it('connects after Meta verification and persists encrypted credentials', async () => {
    verifyWhatsAppCredentials.mockResolvedValue({
      valid: true,
      displayPhoneNumber: '+1 555-0100',
      verifiedName: 'Acme Alerts',
    });
    upsertWhatsAppConnection.mockResolvedValue({
      connected: true,
      wabaId: '102290129340398',
      phoneNumberId: '106540352242922',
      displayPhoneNumber: '+1 555-0100',
      verifiedName: 'Acme Alerts',
      connectedAt: '2026-01-01T00:00:00.000Z',
      lastSuccessfulMessageAt: null,
      disconnectedAt: null,
    });

    const result = await connectWhatsAppAccount({
      userId: 'user-1',
      input: {
        wabaId: '102290129340398',
        phoneNumberId: '106540352242922',
        accessToken: 'EAAabcdefghijklmnopqr1234567890',
        phone: '15551234567',
      },
    });

    expect(result.ok).toBe(true);
    expect(upsertWhatsAppConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        wabaId: '102290129340398',
        phoneNumberId: '106540352242922',
        accessToken: 'EAAabcdefghijklmnopqr1234567890',
      })
    );
    expect(result.connection.connected).toBe(true);
  });

  it('sends a test message and records last success', async () => {
    getWhatsAppCredentials.mockResolvedValue({
      accessToken: 'token',
      phoneNumberId: '106540352242922',
      wabaId: '102290129340398',
      connected: true,
    });
    sendWhatsAppTextMessage.mockResolvedValue({
      ok: true,
      status: 200,
      data: { messages: [{ id: 'wamid.TEST' }] },
    });
    getWhatsAppConnectionPublic.mockResolvedValue({
      connected: true,
      lastSuccessfulMessageAt: '2026-01-02T00:00:00.000Z',
      wabaId: '102290129340398',
      phoneNumberId: '106540352242922',
      displayPhoneNumber: null,
      verifiedName: null,
      connectedAt: '2026-01-01T00:00:00.000Z',
      disconnectedAt: null,
    });

    const result = await sendWhatsAppTestMessage({
      userId: 'user-1',
      to: '15551234567',
    });

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe('wamid.TEST');
    expect(markWhatsAppMessageSuccess).toHaveBeenCalledWith('user-1');
    expect(sendWhatsAppTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '15551234567',
        phoneNumberId: '106540352242922',
      })
    );
  });
});
