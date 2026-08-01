import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGaMeasurementId, getGaCspDirectives } from '@/lib/analytics/ga';

describe('Google Analytics config', () => {
  const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
    }
  });

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  });

  it('returns null when measurement ID is unset', () => {
    expect(getGaMeasurementId()).toBeNull();
    expect(getGaCspDirectives()).toEqual({ scriptSrc: '', connectSrc: '', imgSrc: '' });
  });

  it('returns a valid GA4 measurement ID', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ' G-ABC123XYZ ';
    expect(getGaMeasurementId()).toBe('G-ABC123XYZ');
  });

  it('rejects invalid measurement ID formats', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'UA-123456-1';
    expect(getGaMeasurementId()).toBeNull();
  });

  it('adds CSP directives when GA is enabled', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    const directives = getGaCspDirectives();
    expect(directives.scriptSrc).toContain('googletagmanager.com');
    expect(directives.connectSrc).toContain('google-analytics.com');
  });
});
