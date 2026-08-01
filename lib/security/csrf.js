import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@/lib/security/constants';

/**
 * Validate CSRF defenses for cookie-authenticated mutation requests.
 * Requires a custom header (not sent on simple cross-site form posts)
 * and matching Origin/Referer when present.
 */
export function validateMutationRequest(request) {
  const csrfHeader = request.headers.get(CSRF_HEADER);
  if (csrfHeader !== CSRF_HEADER_VALUE) {
    return { ok: false, error: 'Missing or invalid CSRF header' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!appUrl) {
    return { ok: true };
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== appUrl) {
    return { ok: false, error: 'Invalid origin' };
  }

  const referer = request.headers.get('referer');
  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== appUrl) {
        return { ok: false, error: 'Invalid referer' };
      }
    } catch {
      return { ok: false, error: 'Invalid referer' };
    }
  }

  return { ok: true };
}
