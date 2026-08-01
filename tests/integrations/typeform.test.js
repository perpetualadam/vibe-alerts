import { describe, it, expect } from 'vitest';
import { TypeformIntegration } from '@/lib/integrations/platforms/typeform';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const typeform = new TypeformIntegration();

describe('TypeformIntegration', () => {
  it('detects native form_response webhook', () => {
    expect(
      typeform.detectPayload({
        event_id: 'evt-1',
        event_type: 'form_response',
        form_response: { form_id: 'abc', answers: [] },
      })
    ).toBe(true);
  });

  it('normalizes text, email, choice, and choices answers', () => {
    const result = typeform.normalizePayload({
      event_id: 'evt-99',
      event_type: 'form_response',
      form_response: {
        form_id: 'form-xyz',
        token: 'resp-token',
        submitted_at: '2026-08-01T10:00:00Z',
        answers: [
          {
            type: 'text',
            text: 'Jane Doe',
            field: { ref: 'full_name', title: 'Full name' },
          },
          {
            type: 'email',
            email: 'jane@typeform.com',
            field: { ref: 'email', title: 'Email' },
          },
          {
            type: 'choice',
            choice: { label: 'Starter plan' },
            field: { ref: 'plan', title: 'Choose a plan' },
          },
          {
            type: 'choices',
            choices: { labels: ['Email', 'SMS'] },
            field: { title: 'Contact preferences' },
          },
        ],
      },
    });

    expect(result.source).toBe('typeform');
    expect(result.event_id).toBe('evt-99');
    expect(result.form_id).toBe('form-xyz');
    expect(result.response_token).toBe('resp-token');
    expect(result.full_name).toBe('Jane Doe');
    expect(result.email).toBe('jane@typeform.com');
    expect(result.plan).toBe('Starter plan');
    expect(result.contact_preferences).toBe('Email, SMS');
  });

  it('uses field title when ref is missing', () => {
    const result = typeform.normalizePayload({
      event_type: 'form_response',
      form_response: {
        answers: [
          {
            type: 'phone_number',
            phone_number: '+15551234',
            field: { title: 'Your phone number' },
          },
        ],
      },
    });

    expect(result.your_phone_number).toBe('+15551234');
  });

  it('parseAndNormalizeBody with typeform header', () => {
    const body = JSON.stringify({
      event_type: 'form_response',
      form_response: {
        form_id: 'f1',
        answers: [
          {
            type: 'text',
            text: 'Hello',
            field: { ref: 'message', title: 'Message' },
          },
        ],
      },
    });
    const headers = new Headers({ [PLATFORM_HEADER]: 'typeform' });
    const result = parseAndNormalizeBody(body, headers);

    expect(result.ok).toBe(true);
    expect(result.platform).toBe('typeform');
    const parsed = JSON.parse(result.body);
    expect(parsed.message).toBe('Hello');
    expect(parsed.form_id).toBe('f1');
  });
});
