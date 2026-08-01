import { describe, it, expect } from 'vitest';
import { readBodyWithLimit } from '@/lib/security/body-limit';

describe('readBodyWithLimit', () => {
  it('rejects body larger than limit via Content-Length', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'Content-Length': '1000' },
      body: 'x'.repeat(1000),
    });

    const result = await readBodyWithLimit(request, 100);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
  });

  it('rejects body larger than limit after read', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: 'x'.repeat(200),
    });

    const result = await readBodyWithLimit(request, 100);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
  });

  it('accepts body within limit', async () => {
    const body = '{"name":"Jane"}';
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body,
    });

    const result = await readBodyWithLimit(request, 1000);
    expect(result.ok).toBe(true);
    expect(result.rawBody).toBe(body);
  });
});
