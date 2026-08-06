import { describe, expect, it } from 'vitest';
import {
  DiscordProvider,
  EmailProvider,
  TeamsProvider,
  TelegramProvider,
  WhatsAppProvider,
  getAllPluginIds,
  getPlugin,
} from '@/lib/notifications';
import { SlackProvider } from '@/lib/notifications/providers/slack';

const REQUIRED_METHODS = ['send', 'test', 'healthCheck'];

describe('common notification provider interface', () => {
  const cases = [
    ['telegram', TelegramProvider],
    ['discord', DiscordProvider],
    ['email', EmailProvider],
    ['teams', TeamsProvider],
    ['whatsapp', WhatsAppProvider],
    ['slack', SlackProvider],
  ];

  it('registers all expected providers', () => {
    const ids = getAllPluginIds();
    for (const [id] of cases) {
      expect(ids).toContain(id);
    }
  });

  it.each(cases)('%s implements send/test/healthCheck', (id, ProviderClass) => {
    const provider = getPlugin(id)?.provider ?? new ProviderClass();
    for (const method of REQUIRED_METHODS) {
      expect(typeof provider[method]).toBe('function');
    }
  });

  it('Telegram healthCheck reports missing bot token', async () => {
    const previous = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    const provider = new TelegramProvider();
    const result = await provider.healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.provider).toBe('telegram');
    if (previous === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previous;
  });

  it('Discord healthCheck is healthy when tenant webhook is configured', async () => {
    const provider = new DiscordProvider();
    const result = await provider.healthCheck({
      userId: 'u1',
      profile: {},
      settings: {},
      channelConfigs: {
        discord: {
          enabled: true,
          config: {
            webhook_url: 'https://discord.com/api/webhooks/123456789012345678/abcTOKEN',
          },
        },
      },
      payload: {},
    });
    expect(result.healthy).toBe(true);
    expect(result.provider).toBe('discord');
  });
});
