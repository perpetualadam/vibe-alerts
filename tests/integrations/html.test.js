import { describe, it, expect } from 'vitest';
import { HtmlIntegration, buildHtmlSnippet } from '@/lib/integrations/platforms/html';
import { parseAndNormalizeBody } from '@/lib/integrations/normalize';
import { PLATFORM_HEADER } from '@/lib/integrations/constants';

const html = new HtmlIntegration();

describe('HtmlIntegration', () => {
  it('detects html platform marker', () => {
    expect(html.detectPayload({ _platform: 'html', name: 'Test' })).toBe(true);
  });

  it('normalizes flat form fields', () => {
    const result = html.normalizePayload({
      _platform: 'html',
      name: 'Jane',
      email: 'jane@test.com',
      message: 'Hello',
    });
    expect(result).toEqual({
      source: 'html',
      name: 'Jane',
      email: 'jane@test.com',
      message: 'Hello',
    });
  });

  it('buildHtmlSnippet includes webhook and api key', () => {
    const snippet = buildHtmlSnippet('https://app.com/hook/abc', 'key123');
    expect(snippet).toContain('https://app.com/hook/abc');
    expect(snippet).toContain('key123');
    expect(snippet).toContain('data-vibealerts-form');
  });

  it('parseAndNormalizeBody with html header', () => {
    const headers = new Headers({ [PLATFORM_HEADER]: 'html' });
    const result = parseAndNormalizeBody(
      JSON.stringify({ _platform: 'html', name: 'Bob', email: 'b@t.com' }),
      headers
    );
    expect(result.platform).toBe('html');
    expect(JSON.parse(result.body).name).toBe('Bob');
  });
});
