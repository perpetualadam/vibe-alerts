import { describe, expect, it } from 'vitest';
import { TelegramProvider } from '@/lib/notifications/providers/telegram';

describe('TelegramProvider callable phone numbers', () => {
  const provider = new TelegramProvider();

  it('formats phone fields as MarkdownV2 tel: links', () => {
    const text = provider.formatMessage({
      name: 'Jane Doe',
      phone: '+1 (555) 123-4567',
      message: 'Call me',
    });

    expect(text).toContain('[\\+1 \\(555\\) 123\\-4567](tel:+15551234567)');
    // Non-phone fields stay escaped plain text (not links)
    expect(text).toContain('*Name:* Jane Doe');
    expect(text).toContain('Call me');
    expect(text).not.toContain('[Call me]');
    expect(text).not.toContain('[Jane Doe]');
  });

  it('leaves non-phone fields and invalid phone values as plain escaped text', () => {
    const text = provider.formatMessage({
      order_id: '5551234567',
      phone: 'n/a',
    });

    expect(text).not.toContain('tel:');
    expect(text).toContain('5551234567');
    expect(text).toContain('n/a');
  });

  it('links your_phone_number style keys from Typeform / CF7', () => {
    const text = provider.formatMessage({
      your_phone_number: '+15551234',
    });

    expect(text).toContain('[\\+15551234](tel:+15551234)');
  });
});
