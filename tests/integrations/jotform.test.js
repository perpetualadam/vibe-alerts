import { describe, it, expect } from 'vitest';
import { JotformIntegration } from '@/lib/integrations/platforms/jotform';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';
import { buildIntegrationTestPayload } from '@/lib/integrations/test-payloads';

const jotform = new JotformIntegration();

describe('JotformIntegration', () => {
  it('detects native webhook shape with rawRequest', () => {
    expect(
      jotform.detectPayload({
        formID: '123',
        formTitle: 'Contact',
        submissionID: '456',
        rawRequest: '{}',
      })
    ).toBe(true);
  });

  it('flattens q*_ fields from rawRequest', () => {
    const result = jotform.normalizePayload({
      formID: '99',
      formTitle: 'Lead form',
      submissionID: 'sub-1',
      rawRequest: JSON.stringify({
        q3_name: { first: 'Ada', last: 'Lovelace' },
        q4_email: 'ada@example.com',
        q5_message: 'Hello',
      }),
    });

    expect(result.source).toBe('jotform');
    expect(result.form_id).toBe('99');
    expect(result.name).toBe('Ada Lovelace');
    expect(result.email).toBe('ada@example.com');
    expect(result.message).toBe('Hello');
  });

  it('normalizes via header through parseAndNormalizeBody', () => {
    const payload = buildIntegrationTestPayload('jotform');
    const headers = new Headers({ [PLATFORM_HEADER]: 'jotform' });
    const result = parseAndNormalizeBody(JSON.stringify(payload), headers);
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('jotform');
    const body = JSON.parse(result.body);
    expect(body.source).toBe('jotform');
    expect(body.email).toBe('integration-test@vibealerts.local');
  });
});
