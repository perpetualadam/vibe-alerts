import { describe, expect, it } from 'vitest';
import { buildAnalyticsCsv, toCsv } from '@/lib/analytics/csv';
import { formatMs, resolveAnalyticsRange } from '@/lib/analytics/dates';

describe('analytics helpers', () => {
  it('escapes CSV values', () => {
    const csv = toCsv(
      ['Name', 'Note'],
      [{ Name: 'Ada', Note: 'said "hello", then left' }],
      ['Name', 'Note']
    );
    expect(csv).toContain('"said ""hello"", then left"');
  });

  it('builds a multi-section analytics export', () => {
    const csv = buildAnalyticsCsv({
      overview: {
        totalWebhooks: 10,
        notificationsSent: 8,
        successfulDeliveries: 7,
        failedDeliveries: 1,
        averageDeliveryTimeMs: 120,
        activeProviders: 2,
        topChannel: 'telegram',
      },
      daily: [{ day: '2026-01-01', webhooks: 2, sent: 2, failed: 0 }],
      monthly: [{ month: '2026-01', webhooks: 10, sent: 8, failed: 1 }],
      topSources: [{ source: 'wordpress', count: 5 }],
      channels: [
        { provider: 'telegram', total: 8, sent: 7, failed: 1, avgDeliveryMs: 120 },
      ],
      spam: {
        flagged: 1,
        flagRate: 0.1,
        topSignals: [{ name: 'keyword:viagra', count: 1 }],
      },
    });

    expect(csv).toContain('Overview');
    expect(csv).toContain('Daily Usage');
    expect(csv).toContain('telegram');
    expect(csv).toContain('keyword:viagra');
  });

  it('resolves and caps analytics date ranges', () => {
    const range = resolveAnalyticsRange('2020-01-01', '2026-01-01');
    expect(range.to.getTime() - range.from.getTime()).toBeLessThanOrEqual(
      366 * 86400000 + 1000
    );
    expect(formatMs(250)).toBe('250ms');
    expect(formatMs(1500)).toBe('1.5s');
  });
});
