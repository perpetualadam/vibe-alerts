import { describe, it, expect } from 'vitest';
import { WordPressIntegration } from '@/lib/integrations/platforms/wordpress';
import { detectPlatform, normalizePlatformPayload, parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';
import '@/lib/integrations/registry';

const wp = new WordPressIntegration();

describe('WordPressIntegration', () => {
  it('detects Contact Form 7 payload', () => {
    const payload = {
      'your-name': 'Jane Doe',
      'your-email': 'jane@example.com',
      'your-message': 'Hello',
    };
    expect(wp.detectPayload(payload)).toBe(true);
  });

  it('normalizes Contact Form 7 fields to readable keys', () => {
    const result = wp.normalizePayload({
      'your-name': 'Jane Doe',
      'your-email': 'jane@example.com',
      'your-message': 'Need a quote',
    });
    expect(result).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Need a quote',
      source: 'wordpress',
    });
  });

  it('normalizes WPForms payload', () => {
    const result = wp.normalizePayload({
      form_id: '42',
      fields: {
        name: 'Bob',
        email: 'bob@test.com',
      },
    });
    expect(result.name).toBe('Bob');
    expect(result.email).toBe('bob@test.com');
    expect(result.form_id).toBe('42');
    expect(result.source).toBe('wpforms');
  });

  it('normalizes Gravity Forms payload', () => {
    const result = wp.normalizePayload({
      form_id: '7',
      entry: {
        Name: 'Alice',
        Email: 'alice@test.com',
      },
    });
    expect(result.Name).toBe('Alice');
    expect(result.Email).toBe('alice@test.com');
    expect(result.form_id).toBe('7');
    expect(result.source).toBe('gravity_forms');
  });

  it('normalizes Fluent Forms field bags', () => {
    const result = wp.normalizePayload({
      form_id: '3',
      form_title: 'Lead',
      fields: { email: 'f@test.com', names: 'Sam' },
      _vibealerts_source: 'fluent-forms',
    });
    expect(result.email).toBe('f@test.com');
    expect(result.names).toBe('Sam');
    expect(result.source).toBe('fluent_forms');
  });

  it('normalizes Elementor Forms field bags', () => {
    const result = wp.normalizePayload({
      form_id: 'abc',
      fields: { Name: 'Pat', Email: 'p@test.com' },
      _vibealerts_source: 'elementor-forms',
    });
    expect(result.Name).toBe('Pat');
    expect(result.Email).toBe('p@test.com');
    expect(result.source).toBe('elementor_forms');
  });

  it('exposes native plugin install path in setup metadata', () => {
    expect(WordPressIntegration.setupSteps.join(' ')).toMatch(/Upload Plugin/i);
    expect(WordPressIntegration.description).toMatch(/Fluent Forms/i);
    expect(WordPressIntegration.description).toMatch(/Elementor/i);
  });
});

describe('Platform detection header', () => {
  it('uses X-VibeAlerts-Platform header when set', () => {
    const headers = new Headers({ [PLATFORM_HEADER]: 'wordpress' });
    const payload = { random_field: 'value' };
    const detected = detectPlatform(headers, payload);
    expect(detected).toBe('wordpress');
  });

  it('parseAndNormalizeBody maps CF7 through wordpress adapter', () => {
    const rawBody = JSON.stringify({
      'your-name': 'Test User',
      'your-email': 'test@example.com',
    });
    const headers = new Headers({ [PLATFORM_HEADER]: 'wordpress' });
    const result = parseAndNormalizeBody(rawBody, headers);
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('wordpress');
    const parsed = JSON.parse(result.body);
    expect(parsed.name).toBe('Test User');
    expect(parsed.email).toBe('test@example.com');
  });
});

describe('normalizePlatformPayload', () => {
  it('passes through generic JSON when no platform detected', () => {
    const headers = new Headers();
    const { platform, payload } = normalizePlatformPayload(
      { name: 'Generic', email: 'g@test.com' },
      headers
    );
    expect(platform).toBeNull();
    expect(payload.name).toBe('Generic');
  });
});
