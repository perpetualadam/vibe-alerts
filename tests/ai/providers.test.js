import { afterEach, describe, expect, it } from 'vitest';
import {
  getAiPlatformStatus,
  isAiPlatformConfigured,
  resolveActiveProvider,
} from '@/lib/ai/providers/registry';

const KEYS = [
  'AI_PROVIDER',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'XAI_API_KEY',
];

describe('AI provider registry', () => {
  const prev = {};

  afterEach(() => {
    for (const key of KEYS) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  });

  function snapshot() {
    for (const key of KEYS) prev[key] = process.env[key];
  }

  it('reports unconfigured when no keys are set', () => {
    snapshot();
    for (const key of KEYS) delete process.env[key];
    expect(isAiPlatformConfigured()).toBe(false);
    expect(getAiPlatformStatus().configured).toBe(false);
  });

  it('auto-selects Groq when available', () => {
    snapshot();
    for (const key of KEYS) delete process.env[key];
    process.env.GROQ_API_KEY = 'gsk_test';
    const provider = resolveActiveProvider();
    expect(provider.id).toBe('groq');
  });

  it('honors AI_PROVIDER override', () => {
    snapshot();
    for (const key of KEYS) delete process.env[key];
    process.env.OPENAI_API_KEY = 'sk_test';
    process.env.GROQ_API_KEY = 'gsk_test';
    process.env.AI_PROVIDER = 'openai';
    expect(resolveActiveProvider().id).toBe('openai');
  });
});
