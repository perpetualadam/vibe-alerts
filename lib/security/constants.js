/** Custom header required on cookie-authenticated mutation requests (CSRF defense). */
export const CSRF_HEADER = 'x-vibealerts-csrf';

/** Value sent by the dashboard client on state-changing requests. */
export const CSRF_HEADER_VALUE = '1';
