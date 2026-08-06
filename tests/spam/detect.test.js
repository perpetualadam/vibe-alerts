import { describe, expect, it } from 'vitest';
import { detectSpam } from '@/lib/spam/detect';

describe('detectSpam', () => {
  it('passes clean lead payloads', () => {
    const result = detectSpam({
      Name: 'Ada Lovelace',
      Email: 'ada@example.com',
      Message: 'Interested in a demo next week',
    });
    expect(result.flagged).toBe(false);
    expect(result.score).toBeLessThan(0.72);
  });

  it('flags honeypot + spam keyword combinations', () => {
    const result = detectSpam({
      Name: 'Bot',
      website: 'https://spam.example',
      Message: 'Buy viagra casino betting odds now!!!',
    });
    expect(result.flagged).toBe(true);
    expect(result.signals.some((s) => s.startsWith('honeypot:'))).toBe(true);
    expect(result.signals.some((s) => s.startsWith('keyword:'))).toBe(true);
  });

  it('flags excessive URLs', () => {
    const result = detectSpam({
      Message: 'See http://a.com http://b.com http://c.com http://d.com',
    });
    expect(result.signals).toContain('excessive_urls');
  });
});
