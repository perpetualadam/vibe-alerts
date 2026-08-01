import { describe, it, expect, beforeEach } from 'vitest';
import { buildLlmsTxt, buildLlmsFullTxt } from '@/lib/seo/llms';

describe('LLMO llms.txt', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://vibe-alerts.com';
  });

  it('builds llms.txt with product name and summary', () => {
    const content = buildLlmsTxt();
    expect(content).toContain('# VibeAlerts');
    expect(content).toContain('## Summary');
    expect(content).toContain('Telegram');
    expect(content).toContain('https://vibe-alerts.com/');
  });

  it('includes FAQ section for AI answer engines', () => {
    const content = buildLlmsTxt();
    expect(content).toContain('## Frequently asked questions');
    expect(content).toContain('What is VibeAlerts?');
  });

  it('includes platform list and webhook info', () => {
    const content = buildLlmsTxt();
    expect(content).toContain('WordPress');
    expect(content).toContain('Typeform');
    expect(content).toContain('/api/v1/webhook/');
  });

  it('builds extended llms-full.txt with technical details', () => {
    const content = buildLlmsFullTxt();
    expect(content).toContain('Full Reference');
    expect(content).toContain('X-VibeAlerts-Key');
    expect(content).toContain('Stripe subscription');
  });

  it('links to llms-full.txt from main file', () => {
    const content = buildLlmsTxt();
    expect(content).toContain('/llms-full.txt');
  });
});
