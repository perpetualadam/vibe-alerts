import { describe, it, expect, beforeEach } from 'vitest';
import { validateMutationRequest } from '@/lib/security/csrf';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@/lib/security/constants';

describe('validateMutationRequest', () => {
  const appUrl = 'http://localhost:3000';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
  });

  it('rejects requests without CSRF header', () => {
    const request = new Request('http://localhost:3000/api/dashboard/settings', {
      method: 'PATCH',
      headers: { origin: appUrl },
    });
    const result = validateMutationRequest(request);
    expect(result.ok).toBe(false);
  });

  it('rejects requests with wrong CSRF header value', () => {
    const request = new Request('http://localhost:3000/api/dashboard/settings', {
      method: 'PATCH',
      headers: {
        origin: appUrl,
        [CSRF_HEADER]: 'wrong',
      },
    });
    const result = validateMutationRequest(request);
    expect(result.ok).toBe(false);
  });

  it('rejects cross-origin requests', () => {
    const request = new Request('http://localhost:3000/api/dashboard/settings', {
      method: 'PATCH',
      headers: {
        origin: 'https://evil.example',
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
      },
    });
    const result = validateMutationRequest(request);
    expect(result.ok).toBe(false);
  });

  it('accepts valid same-origin mutation request', () => {
    const request = new Request('http://localhost:3000/api/dashboard/settings', {
      method: 'PATCH',
      headers: {
        origin: appUrl,
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
      },
    });
    const result = validateMutationRequest(request);
    expect(result.ok).toBe(true);
  });
});
