import { describe, expect, it } from 'vitest';
import { getLivenessStatus } from '@/lib/monitoring/health';
import { getHealthStatus } from '@/lib/health';

describe('monitoring health', () => {
  it('liveness matches legacy health helper', () => {
    const live = getLivenessStatus();
    const legacy = getHealthStatus();
    expect(live.status).toBe('ok');
    expect(legacy.status).toBe('ok');
    expect(live.service).toBe('vibe-alerts');
    expect(legacy.service).toBe('vibe-alerts');
  });
});
