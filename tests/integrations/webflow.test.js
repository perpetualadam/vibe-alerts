import { describe, it, expect } from 'vitest';
import { WebflowIntegration } from '@/lib/integrations/platforms/webflow';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const webflow = new WebflowIntegration();

describe('WebflowIntegration', () => {
  it('detects native Webflow form webhook', () => {
    expect(webflow.detectPayload({
      triggerType: 'form_submission',
      name: 'Contact Form',
      site: 'my-site',
      data: { Name: 'Jane', Email: 'jane@webflow.com' },
    })).toBe(true);
  });

  it('normalizes Webflow form submission', () => {
    const result = webflow.normalizePayload({
      _id: 'sub_123',
      name: 'Contact Form',
      site: 'acme-web',
      triggerType: 'form_submission',
      data: {
        Name: 'Jane Doe',
        Email: 'jane@acme.com',
        Message: 'Interested in services',
      },
    });
    expect(result.form_name).toBe('Contact Form');
    expect(result.site).toBe('acme-web');
    expect(result.Name).toBe('Jane Doe');
    expect(result.Email).toBe('jane@acme.com');
    expect(result.source).toBe('webflow');
  });

  it('parseAndNormalizeBody with webflow header', () => {
    const payload = {
      name: 'Newsletter',
      site: 'blog',
      data: { email: 'sub@test.com' },
    };
    const headers = new Headers({ [PLATFORM_HEADER]: 'webflow' });
    const result = parseAndNormalizeBody(JSON.stringify(payload), headers);
    expect(result.platform).toBe('webflow');
    expect(JSON.parse(result.body).email).toBe('sub@test.com');
  });
});
