import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderId,
  LlmProvider,
} from '@/lib/ai/types';

export interface OpenAiCompatibleConfig {
  id: AiProviderId;
  label: string;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModelEnv: string;
  fallbackModel: string;
}

/**
 * Shared Chat Completions client for OpenAI, Groq, and xAI (Grok).
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly id: AiProviderId;
  readonly label: string;
  private readonly baseUrl: string;
  private readonly apiKeyEnv: string;
  private readonly defaultModelEnv: string;
  private readonly fallbackModel: string;

  constructor(config: OpenAiCompatibleConfig) {
    this.id = config.id;
    this.label = config.label;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKeyEnv = config.apiKeyEnv;
    this.defaultModelEnv = config.defaultModelEnv;
    this.fallbackModel = config.fallbackModel;
  }

  isConfigured(): boolean {
    return Boolean(process.env[this.apiKeyEnv]?.trim());
  }

  defaultModel(): string {
    return process.env[this.defaultModelEnv]?.trim() || this.fallbackModel;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = process.env[this.apiKeyEnv]?.trim();
    if (!apiKey) {
      throw new Error(`${this.label} is not configured (${this.apiKeyEnv} missing)`);
    }

    const model = this.defaultModel();
    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 800,
    };

    if (request.json) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof raw === 'object' && raw && 'error' in raw
          ? JSON.stringify((raw as { error: unknown }).error)
          : `HTTP ${res.status}`;
      throw new Error(`${this.label} completion failed: ${message}`);
    }

    const content =
      raw?.choices?.[0]?.message?.content != null
        ? String(raw.choices[0].message.content)
        : '';

    if (!content.trim()) {
      throw new Error(`${this.label} returned an empty completion`);
    }

    return { content, provider: this.id, model, raw };
  }
}

export const openaiProvider = new OpenAiCompatibleProvider({
  id: 'openai',
  label: 'OpenAI',
  baseUrl: process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
  apiKeyEnv: 'OPENAI_API_KEY',
  defaultModelEnv: 'OPENAI_MODEL',
  fallbackModel: 'gpt-4o-mini',
});

export const groqProvider = new OpenAiCompatibleProvider({
  id: 'groq',
  label: 'Groq',
  baseUrl: process.env.GROQ_BASE_URL?.trim() || 'https://api.groq.com/openai/v1',
  apiKeyEnv: 'GROQ_API_KEY',
  defaultModelEnv: 'GROQ_MODEL',
  fallbackModel: 'llama-3.3-70b-versatile',
});

export const grokProvider = new OpenAiCompatibleProvider({
  id: 'grok',
  label: 'Grok (xAI)',
  baseUrl: process.env.XAI_BASE_URL?.trim() || 'https://api.x.ai/v1',
  apiKeyEnv: 'XAI_API_KEY',
  defaultModelEnv: 'XAI_MODEL',
  fallbackModel: 'grok-2-latest',
});
