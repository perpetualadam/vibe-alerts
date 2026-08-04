import { describe, expect, it } from 'vitest';
import {
  formatCallablePhoneValue,
  isPhoneFieldKey,
  normalizeTelHref,
} from '@/lib/notifications/utils/phone';

describe('phone helpers', () => {
  it('detects common phone field keys', () => {
    expect(isPhoneFieldKey('phone')).toBe(true);
    expect(isPhoneFieldKey('phone_number')).toBe(true);
    expect(isPhoneFieldKey('your_phone')).toBe(true);
    expect(isPhoneFieldKey('your-phone')).toBe(true);
    expect(isPhoneFieldKey('mobile')).toBe(true);
    expect(isPhoneFieldKey('telephone')).toBe(true);
    expect(isPhoneFieldKey('name')).toBe(false);
    expect(isPhoneFieldKey('email')).toBe(false);
    expect(isPhoneFieldKey('order_id')).toBe(false);
  });

  it('normalizes dialable values to tel: hrefs', () => {
    expect(normalizeTelHref('+1 (555) 123-4567')).toBe('tel:+15551234567');
    expect(normalizeTelHref('555-123-4567')).toBe('tel:5551234567');
    expect(normalizeTelHref('+15551234')).toBe('tel:+15551234');
  });

  it('rejects non-phone values', () => {
    expect(normalizeTelHref('not-a-phone')).toBeNull();
    expect(normalizeTelHref('123')).toBeNull();
    expect(normalizeTelHref('user@example.com')).toBeNull();
    expect(normalizeTelHref('https://example.com')).toBeNull();
  });

  it('formats callable values only for phone fields with dialable numbers', () => {
    const fmt = (display, href) => `${display}|${href}`;
    expect(formatCallablePhoneValue('phone', '+15551234567', fmt)).toBe(
      '+15551234567|tel:+15551234567'
    );
    expect(formatCallablePhoneValue('name', '+15551234567', fmt)).toBeNull();
    expect(formatCallablePhoneValue('phone', 'hello', fmt)).toBeNull();
  });
});
