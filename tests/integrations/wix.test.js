import { describe, it, expect } from 'vitest';
import { WixIntegration } from '@/lib/integrations/platforms/wix';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const wix = new WixIntegration();

describe('WixIntegration', () => {
  it('detects Wix automation payload', () => {
    expect(wix.detectPayload({
      formName: 'Contact',
      metaSiteId: 'abc123',
      data: { firstName: 'Jane' },
    })).toBe(true);
  });

  it('normalizes Wix automation data object', () => {
    const result = wix.normalizePayload({
      formName: 'Contact Us',
      metaSiteId: 'site-1',
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@wix.com',
        message: 'Hello',
      },
    });
    expect(result.form_name).toBe('Contact Us');
    expect(result.site_id).toBe('site-1');
    expect(result.first_name).toBe('Jane');
    expect(result.email).toBe('jane@wix.com');
    expect(result.source).toBe('wix');
  });

  it('normalizes flat Velo payload', () => {
    const result = wix.normalizePayload({
      _platform: 'wix',
      name: 'Bob',
      email: 'bob@site.com',
      phone: '5551234',
    });
    expect(result.name).toBe('Bob');
    expect(result.email).toBe('bob@site.com');
  });

  it('parseAndNormalizeBody with wix header', () => {
    const body = JSON.stringify({
      formName: 'Lead',
      data: { email: 'lead@wix.com', message: 'Hi' },
    });
    const headers = new Headers({ [PLATFORM_HEADER]: 'wix' });
    const result = parseAndNormalizeBody(body, headers);
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('wix');
    const parsed = JSON.parse(result.body);
    expect(parsed.email).toBe('lead@wix.com');
  });
});
