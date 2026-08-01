import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@/lib/security/constants';

/** Headers for cookie-authenticated dashboard mutation requests. */
export function dashboardMutationHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    [CSRF_HEADER]: CSRF_HEADER_VALUE,
    ...extra,
  };
}
