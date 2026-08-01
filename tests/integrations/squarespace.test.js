import { describe, it, expect } from 'vitest';
import { SquarespaceIntegration } from '@/lib/integrations/platforms/squarespace';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const squarespace = new SquarespaceIntegration();

describe('SquarespaceIntegration', () => {
  it('detects connector payload with fields object', () => {
    expect(
      squarespace.detectPayload({
        formName: 'Contact',
        fields: { name: 'Jane', email: 'jane@example.com' },
      })
    ).toBe(true);
  });

  it('detects _platform squarespace marker', () => {
    expect(squarespace.detectPayload({ _platform: 'squarespace', email: 'a@b.com' })).toBe(true);
  });

  it('normalizes connector payload with fields', () => {
    const result = squarespace.normalizePayload({
      formName: 'Contact Us',
      pageUrl: 'https://example.squarespace.com/contact',
      submissionTimestamp: '2026-08-01T12:00:00.000Z',
      fields: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Hello there',
      },
    });

    expect(result.source).toBe('squarespace');
    expect(result.form_name).toBe('Contact Us');
    expect(result.page_url).toBe('https://example.squarespace.com/contact');
    expect(result.name).toBe('Jane Doe');
    expect(result.email).toBe('jane@example.com');
    expect(result.message).toBe('Hello there');
  });

  it('normalizes Zapier-style flat payload with data object', () => {
    const result = squarespace.normalizePayload({
      formId: 'form-abc',
      submissionId: 'sub-123',
      data: {
        Name: 'Bob',
        Email: 'bob@site.com',
      },
    });

    expect(result.form_id).toBe('form-abc');
    expect(result.submission_id).toBe('sub-123');
    expect(result.name).toBe('Bob');
    expect(result.email).toBe('bob@site.com');
  });

  it('parseAndNormalizeBody with squarespace header', () => {
    const body = JSON.stringify({
      formName: 'Newsletter',
      fields: { email: 'signup@example.com' },
    });
    const headers = new Headers({ [PLATFORM_HEADER]: 'squarespace' });
    const result = parseAndNormalizeBody(body, headers);

    expect(result.ok).toBe(true);
    expect(result.platform).toBe('squarespace');
    const parsed = JSON.parse(result.body);
    expect(parsed.email).toBe('signup@example.com');
    expect(parsed.form_name).toBe('Newsletter');
  });
});
