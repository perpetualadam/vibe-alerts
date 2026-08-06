import { describe, expect, it } from 'vitest';
import { logsCacheKey } from '@/lib/pwa/offline-logs';

describe('offline notification log cache keys', () => {
  it('builds stable keys from query params', () => {
    const a = logsCacheKey(new URLSearchParams({ provider: 'telegram', outcome: 'all' }));
    const b = logsCacheKey('provider=telegram&outcome=all');
    expect(a).toBe('logs:provider=telegram&outcome=all');
    expect(b).toBe(a);
  });
});
