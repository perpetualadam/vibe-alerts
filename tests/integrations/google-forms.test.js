import { describe, it, expect } from 'vitest';
import { GoogleFormsIntegration } from '@/lib/integrations/platforms/google-forms';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const googleForms = new GoogleFormsIntegration();

describe('GoogleFormsIntegration', () => {
  it('detects Apps Script connector payload', () => {
    expect(
      googleForms.detectPayload({
        _platform: 'google_forms',
        formId: 'form-1',
        answers: { Name: 'Jane' },
      })
    ).toBe(true);
  });

  it('detects formId with answers object', () => {
    expect(
      googleForms.detectPayload({
        formId: 'abc123',
        formTitle: 'Contact',
        answers: { Email: 'a@b.com' },
      })
    ).toBe(true);
  });

  it('normalizes answers object from Apps Script', () => {
    const result = googleForms.normalizePayload({
      formId: 'form-abc',
      formTitle: 'Contact Us',
      responseId: 'resp-99',
      responseTimestamp: '2026-08-01T14:00:00.000Z',
      respondentEmail: 'jane@example.com',
      answers: {
        Name: 'Jane Doe',
        Email: 'jane@example.com',
        Message: 'Hello from Google Forms',
      },
    });

    expect(result.source).toBe('google_forms');
    expect(result.form_id).toBe('form-abc');
    expect(result.form_title).toBe('Contact Us');
    expect(result.response_id).toBe('resp-99');
    expect(result.email).toBe('jane@example.com');
    expect(result.name).toBe('Jane Doe');
    expect(result.message).toBe('Hello from Google Forms');
  });

  it('normalizes itemResponses array format', () => {
    const result = googleForms.normalizePayload({
      formId: 'f1',
      itemResponses: [
        { title: 'Your name', answer: 'Bob' },
        { title: 'Phone number', answer: '555-0100' },
      ],
    });

    expect(result.your_name).toBe('Bob');
    expect(result.phone_number).toBe('555-0100');
  });

  it('parseAndNormalizeBody with google_forms header', () => {
    const body = JSON.stringify({
      formId: 'f1',
      formTitle: 'Lead Form',
      answers: { Email: 'lead@gmail.com', Company: 'Acme' },
    });
    const headers = new Headers({ [PLATFORM_HEADER]: 'google_forms' });
    const result = parseAndNormalizeBody(body, headers);

    expect(result.ok).toBe(true);
    expect(result.platform).toBe('google_forms');
    const parsed = JSON.parse(result.body);
    expect(parsed.email).toBe('lead@gmail.com');
    expect(parsed.company).toBe('Acme');
    expect(parsed.form_title).toBe('Lead Form');
  });
});
