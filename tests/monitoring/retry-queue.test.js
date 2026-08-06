import { describe, expect, it } from 'vitest';
import { computeNextRetryDelaySeconds, ASYNC_MAX_ATTEMPTS } from '@/lib/notifications/retry-queue';
import { isEmailPlatformAdmin } from '@/lib/monitoring/admin';

describe('retry queue exponential backoff', () => {
  it('grows exponentially and caps at 1 hour', () => {
    expect(computeNextRetryDelaySeconds(1)).toBe(60);
    expect(computeNextRetryDelaySeconds(2)).toBe(120);
    expect(computeNextRetryDelaySeconds(3)).toBe(240);
    expect(computeNextRetryDelaySeconds(4)).toBe(480);
    expect(computeNextRetryDelaySeconds(5)).toBe(960);
    expect(computeNextRetryDelaySeconds(10)).toBe(3600);
  });

  it('exposes a durable attempt budget', () => {
    expect(ASYNC_MAX_ATTEMPTS).toBeGreaterThanOrEqual(3);
  });
});

describe('platform admin allowlist', () => {
  it('matches emails from PLATFORM_ADMIN_EMAILS', () => {
    const prev = process.env.PLATFORM_ADMIN_EMAILS;
    process.env.PLATFORM_ADMIN_EMAILS = 'ops@vibe-alerts.com, Oncall@Example.com';
    expect(isEmailPlatformAdmin('ops@vibe-alerts.com')).toBe(true);
    expect(isEmailPlatformAdmin('oncall@example.com')).toBe(true);
    expect(isEmailPlatformAdmin('user@example.com')).toBe(false);
    process.env.PLATFORM_ADMIN_EMAILS = prev;
  });

  it('denies when allowlist is empty', () => {
    const prev = process.env.PLATFORM_ADMIN_EMAILS;
    process.env.PLATFORM_ADMIN_EMAILS = '';
    expect(isEmailPlatformAdmin('ops@vibe-alerts.com')).toBe(false);
    process.env.PLATFORM_ADMIN_EMAILS = prev;
  });
});
