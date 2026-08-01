import { describe, it, expect } from 'vitest';
import { buildPasswordResetRedirectUrl } from '@/lib/auth/reset';

describe('buildPasswordResetRedirectUrl', () => {
  it('builds callback URL with reset-password next path', () => {
    const url = buildPasswordResetRedirectUrl('https://vibe-alerts.com');
    expect(url).toBe(
      'https://vibe-alerts.com/auth/callback?next=%2Flogin%2Freset-password'
    );
  });

  it('strips trailing slash from origin', () => {
    const url = buildPasswordResetRedirectUrl('http://localhost:3000/');
    expect(url).toBe(
      'http://localhost:3000/auth/callback?next=%2Flogin%2Freset-password'
    );
  });
});
