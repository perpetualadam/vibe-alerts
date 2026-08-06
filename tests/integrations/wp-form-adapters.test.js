import { describe, it, expect } from 'vitest';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';
import { getPlatform, getPlatformCatalog } from '@/lib/integrations/registry';
import { buildIntegrationTestPayload } from '@/lib/integrations/test-payloads';
import { NATIVE_INTEGRATION_IDS } from '@/lib/integrations/constants';

describe('WordPress form plugin adapters', () => {
  const cases = [
    ['contact_form_7', 'contact_form_7'],
    ['wpforms', 'wpforms'],
    ['gravity_forms', 'gravity_forms'],
    ['elementor_forms', 'elementor_forms'],
    ['fluent_forms', 'fluent_forms'],
  ];

  it.each(cases)('%s is registered with setup guide', (id) => {
    const adapter = getPlatform(id);
    expect(adapter).toBeTruthy();
    expect(adapter.constructor.setupSteps.length).toBeGreaterThan(2);
  });

  it.each(cases)('normalizes %s test payload via header', (id) => {
    const payload = buildIntegrationTestPayload(id);
    const headers = new Headers({ [PLATFORM_HEADER]: id });
    const result = parseAndNormalizeBody(JSON.stringify(payload), headers);
    expect(result.ok).toBe(true);
    expect(result.platform).toBe(id);
    const body = JSON.parse(result.body);
    expect(body.source).toBe(id);
  });

  it('auto-detects CF7 from your-* fields', () => {
    const headers = new Headers();
    const result = parseAndNormalizeBody(
      JSON.stringify({
        'your-name': 'Ada',
        'your-email': 'ada@example.com',
        'your-message': 'Hi',
      }),
      headers
    );
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('contact_form_7');
  });

  it('auto-detects gravity from entry bag', () => {
    const headers = new Headers();
    const result = parseAndNormalizeBody(
      JSON.stringify({
        form_id: '1',
        entry: { '1': 'Ada', '2': 'ada@example.com' },
      }),
      headers
    );
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('gravity_forms');
  });
});

describe('Native integration catalog', () => {
  it('includes all Prompt 14 platforms with test support', () => {
    const catalog = getPlatformCatalog();
    const ids = catalog.map((p) => p.id);
    for (const id of NATIVE_INTEGRATION_IDS) {
      expect(ids).toContain(id);
      const row = catalog.find((p) => p.id === id);
      expect(row.supportsTest).toBe(true);
      expect(row.setupSteps.length).toBeGreaterThan(1);
    }
  });
});
