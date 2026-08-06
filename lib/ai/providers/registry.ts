import type { AiProviderId, LlmProvider } from '@/lib/ai/types';
import { anthropicProvider } from '@/lib/ai/providers/anthropic';
import {
  grokProvider,
  groqProvider,
  openaiProvider,
} from '@/lib/ai/providers/openai-compatible';

const PROVIDERS: Record<AiProviderId, LlmProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  groq: groqProvider,
  grok: grokProvider,
};

/** Preference order when AI_PROVIDER is unset */
const AUTO_ORDER: AiProviderId[] = ['groq', 'openai', 'anthropic', 'grok'];

export function getProvider(id: AiProviderId): LlmProvider {
  return PROVIDERS[id];
}

export function listProviders(): LlmProvider[] {
  return Object.values(PROVIDERS);
}

export function listConfiguredProviders(): LlmProvider[] {
  return listProviders().filter((p) => p.isConfigured());
}

/**
 * Resolve the active platform LLM provider (env-driven, multi-provider ready).
 */
export function resolveActiveProvider(override?: string | null): LlmProvider {
  const requested = (override || process.env.AI_PROVIDER || '').trim().toLowerCase();
  if (requested && requested in PROVIDERS) {
    const provider = PROVIDERS[requested as AiProviderId];
    if (!provider.isConfigured()) {
      throw new Error(
        `AI_PROVIDER=${requested} is selected but its API key is not configured`
      );
    }
    return provider;
  }

  for (const id of AUTO_ORDER) {
    if (PROVIDERS[id].isConfigured()) return PROVIDERS[id];
  }

  throw new Error(
    'No AI provider configured. Set one of: GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY'
  );
}

export function isAiPlatformConfigured(): boolean {
  return listConfiguredProviders().length > 0;
}

export function getAiPlatformStatus() {
  return {
    configured: isAiPlatformConfigured(),
    active: (() => {
      try {
        const p = resolveActiveProvider();
        return { id: p.id, label: p.label, model: p.defaultModel() };
      } catch {
        return null;
      }
    })(),
    providers: listProviders().map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.isConfigured(),
      model: p.defaultModel(),
    })),
  };
}
