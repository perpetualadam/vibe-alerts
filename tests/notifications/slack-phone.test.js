import { describe, expect, it } from 'vitest';
import { SlackProvider } from '@/lib/notifications/providers/slack';

describe('SlackProvider callable phone numbers', () => {
  const provider = new SlackProvider();

  it('formats phone fields as Slack mrkdwn tel: links', () => {
    const message = provider.formatMessage({
      name: 'Jane Doe',
      phone: '+1 (555) 123-4567',
      message: 'Call me',
    });

    const phoneField = message.blocks
      .flatMap((b) => b.fields || [])
      .find((f) => f.text.startsWith('*Phone:*'));

    expect(phoneField).toBeTruthy();
    expect(phoneField.text).toBe(
      '*Phone:*\n<tel:+15551234567|+1 (555) 123-4567>'
    );

    const nameField = message.blocks
      .flatMap((b) => b.fields || [])
      .find((f) => f.text.startsWith('*Name:*'));
    expect(nameField.text).toBe('*Name:*\nJane Doe');
    expect(nameField.text).not.toContain('tel:');
  });

  it('leaves non-phone fields and invalid phone values as plain text', () => {
    const message = provider.formatMessage({
      order_id: '5551234567',
      phone: 'n/a',
    });

    const fields = message.blocks.flatMap((b) => b.fields || []);
    expect(fields.some((f) => f.text.includes('tel:'))).toBe(false);
    expect(fields.find((f) => f.text.startsWith('*Order Id:*')).text).toContain(
      '5551234567'
    );
  });

  it('links your_phone style keys from Contact Form 7', () => {
    const message = provider.formatMessage({
      your_phone: '555-0100',
    });

    const phoneField = message.blocks
      .flatMap((b) => b.fields || [])
      .find((f) => f.text.includes('Your Phone'));

    expect(phoneField.text).toContain('<tel:5550100|555-0100>');
  });
});
