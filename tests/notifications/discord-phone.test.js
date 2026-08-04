import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { DiscordProvider } from '@/lib/notifications/providers/discord';

describe('DiscordProvider callable phone numbers', () => {
  const provider = new DiscordProvider();

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats phone fields as Discord markdown tel: links in embed fields', () => {
    const message = provider.formatMessage({
      name: 'Jane Doe',
      phone: '+1 (555) 123-4567',
      message: 'Call me',
    });

    const fields = message.embeds[0].fields;
    const phoneField = fields.find((f) => f.name === 'Phone');
    expect(phoneField.value).toBe('[+1 (555) 123-4567](tel:+15551234567)');

    const nameField = fields.find((f) => f.name === 'Name');
    expect(nameField.value).toBe('Jane Doe');
    expect(nameField.value).not.toContain('tel:');
  });

  it('leaves non-phone fields and invalid phone values as plain text', () => {
    const message = provider.formatMessage({
      order_id: '5551234567',
      phone: 'n/a',
    });

    const fields = message.embeds[0].fields;
    expect(fields.some((f) => String(f.value).includes('tel:'))).toBe(false);
    expect(fields.find((f) => f.name === 'Order Id').value).toBe('5551234567');
    expect(fields.find((f) => f.name === 'Phone').value).toBe('n/a');
  });

  it('links phone_number style keys from Google Forms', () => {
    const message = provider.formatMessage({
      phone_number: '555-0100',
    });

    const phoneField = message.embeds[0].fields.find((f) => f.name === 'Phone Number');
    expect(phoneField.value).toBe('[555-0100](tel:5550100)');
  });

  it('rejects non-Discord webhook URLs', () => {
    expect(
      provider.validateConfig({
        webhook_url: 'https://hooks.slack.com/services/T/B/X',
      }).valid
    ).toBe(false);
    expect(
      provider.validateConfig({
        webhook_url: 'https://discord.com/api/webhooks/123456789012345678/abcTOKEN',
      }).valid
    ).toBe(true);
  });

  it('posts formatted payload to the Discord webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider.send({
      channelConfigs: {
        discord: {
          enabled: true,
          config: {
            webhook_url: 'https://discord.com/api/webhooks/123456789012345678/abcTOKEN',
          },
        },
      },
      payload: { phone: '+15551234567', name: 'Ada' },
    });

    expect(result.success).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.embeds[0].fields.find((f) => f.name === 'Phone').value).toBe(
      '[+15551234567](tel:+15551234567)'
    );
  });
});
