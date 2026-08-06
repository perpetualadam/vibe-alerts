import type {
  AiCompletionRequest,
  AiCompletionResponse,
  LlmProvider,
} from '@/lib/ai/types';

/**
 * Anthropic Messages API adapter.
 */
export class AnthropicProvider implements LlmProvider {
  readonly id = 'anthropic' as const;
  readonly label = 'Anthropic';

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }

  defaultModel(): string {
    return process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-latest';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('Anthropic is not configured (ANTHROPIC_API_KEY missing)');
    }

    const model = this.defaultModel();
    const system = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 800,
        temperature: request.temperature ?? 0.2,
        system: system || undefined,
        messages,
      }),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof raw === 'object' && raw && 'error' in raw
          ? JSON.stringify((raw as { error: unknown }).error)
          : `HTTP ${res.status}`;
      throw new Error(`Anthropic completion failed: ${message}`);
    }

    const blocks = Array.isArray(raw?.content) ? raw.content : [];
    const content = blocks
      .filter((b: { type?: string }) => b?.type === 'text')
      .map((b: { text?: string }) => String(b.text || ''))
      .join('\n')
      .trim();

    if (!content) {
      throw new Error('Anthropic returned an empty completion');
    }

    return { content, provider: this.id, model, raw };
  }
}

export const anthropicProvider = new AnthropicProvider();
