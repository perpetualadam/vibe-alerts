/**
 * Google Analytics 4 (optional — enabled when NEXT_PUBLIC_GA_MEASUREMENT_ID is set).
 */

const GA_ID_PATTERN = /^G-[A-Z0-9]+$/i;

/** @returns {string | null} */
export function getGaMeasurementId() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id || !GA_ID_PATTERN.test(id)) return null;
  return id;
}

/** CSP additions required when GA is enabled. */
export function getGaCspDirectives() {
  if (!getGaMeasurementId()) {
    return { scriptSrc: '', connectSrc: '', imgSrc: '' };
  }

  return {
    scriptSrc: ' https://www.googletagmanager.com',
    connectSrc:
      ' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com',
    imgSrc: ' https://www.google-analytics.com https://www.googletagmanager.com',
  };
}
