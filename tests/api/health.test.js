import { describe, it, expect } from 'vitest';
import { getHealthStatus } from '@/lib/health';

describe('Health check', () => {
  it('returns ok status with service name', () => {
    const health = getHealthStatus();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('vibe-alerts');
    expect(health.timestamp).toBeTruthy();
    expect(new Date(health.timestamp).toString()).not.toBe('Invalid Date');
  });
});
