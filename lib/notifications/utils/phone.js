/**
 * Detect and format phone field values as callable tel: links.
 * Used at send-time only — payload storage stays plain strings.
 */

// Allow common form prefixes (contact_, home_, your_) and compounds
// (mobile_phone). Longer tokens first so "cellphone" / "telephone" win.
const PHONE_FIELD_RE =
  /^(?:[a-z][a-z0-9]*[_-])*(telephone|cellphone|phone|mobile|tel|cell)(?:[_-]?(?:phone|number|no|num))?$/i;

/** Keys that typically hold a lead phone number */
export function isPhoneFieldKey(key) {
  return PHONE_FIELD_RE.test(String(key ?? '').trim());
}

/**
 * Build a tel: href from a phone-like value, or null if not dialable.
 * Keeps a leading + for E.164; strips other non-digits.
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeTelHref(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // Reject values that are clearly not phone numbers (emails, URLs, long text)
  if (/[@/]|https?:/i.test(raw)) return null;
  if (!/^[\d\s().+\-extEXT#]+$/.test(raw)) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;

  const hasPlus = raw.startsWith('+');
  return `tel:${hasPlus ? '+' : ''}${digits}`;
}

/**
 * If key+value look like a phone, return formatter(display, telHref); else null.
 * @param {string} key
 * @param {unknown} value
 * @param {(display: string, href: string) => string} formatter
 * @returns {string | null}
 */
export function formatCallablePhoneValue(key, value, formatter) {
  if (!isPhoneFieldKey(key)) return null;
  const href = normalizeTelHref(value);
  if (!href) return null;
  const display = String(value).trim();
  return formatter(display, href);
}
