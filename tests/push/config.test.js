import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getVapidConfig, isWebPushConfigured } from '@/lib/push/config';

describe('Web Push VAPID config', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('reports unconfigured when keys missing', () => {
    expect(isWebPushConfigured()).toBe(false);
  });

  it('reads public/private keys and normalizes subject', () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    process.env.VAPID_SUBJECT = 'ops@example.com';
    const cfg = getVapidConfig();
    expect(cfg.configured).toBe(true);
    expect(cfg.publicKey).toBe('pub');
    expect(cfg.privateKey).toBe('priv');
    expect(cfg.subject).toBe('mailto:ops@example.com');
  });
});
