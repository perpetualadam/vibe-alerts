import { describe, expect, it } from 'vitest';
import {
  getAllPluginIds,
  getPlugin,
  getPluginCatalog,
  validatePluginConfig,
} from '@/lib/notifications';

describe('notification plugin registry', () => {
  it('registers Discord alongside Telegram, Slack, and WhatsApp', () => {
    const ids = getAllPluginIds();
    expect(ids).toContain('telegram');
    expect(ids).toContain('slack');
    expect(ids).toContain('whatsapp');
    expect(ids).toContain('discord');
    expect(ids).toContain('teams');
    expect(ids).toContain('email');
  });

  it('exposes Discord in the dashboard plugin catalog', () => {
    const discord = getPluginCatalog().find((p) => p.id === 'discord');
    expect(discord).toBeTruthy();
    expect(discord.label).toBe('Discord');
    expect(discord.platformReady).toBe(true);
    expect(discord.configSchema.some((f) => f.key === 'webhook_url')).toBe(true);
    expect(discord.setupGuide.length).toBeGreaterThan(0);
  });

  it('validates Discord webhook URLs like Slack-style channels', () => {
    expect(
      validatePluginConfig('discord', {
        webhook_url: 'https://discord.com/api/webhooks/123456789012345678/abcTOKEN',
      }).valid
    ).toBe(true);
    expect(
      validatePluginConfig('discord', {
        webhook_url: 'https://example.com/hooks/not-discord',
      }).valid
    ).toBe(false);
    expect(getPlugin('discord')?.provider.isPlatformReady()).toBe(true);
  });
});
