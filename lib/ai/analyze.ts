import { parseLeadAnalysisJson } from '@/lib/ai/schema';
import { resolveActiveProvider } from '@/lib/ai/providers/registry';
import type { AiProviderId, LeadAnalysisResult } from '@/lib/ai/types';

const SYSTEM_PROMPT = `You are VibeAlerts lead intelligence. Analyze inbound website form / webhook leads.
Return ONLY a JSON object with these keys:
- summary: 1-2 sentence plain-English lead summary
- category: short label (e.g. Sales, Support, Partnership, Hiring, Spam, Other)
- priority: one of Low, Medium, High
- spamScore: number 0-100 (higher = more likely spam/junk)
- sentiment: one of Positive, Neutral, Negative, Mixed
- estimatedIntent: short phrase for what the person wants

Be concise and production-safe. Do not invent contact details not present in the payload.`;

export interface AnalyzeLeadOptions {
  payload: Record<string, string>;
  heuristicSpamScore?: number | null;
  providerOverride?: string | null;
}

export interface AnalyzeLeadOutcome extends LeadAnalysisResult {
  provider: AiProviderId | string;
  model: string;
  raw: unknown;
}

/**
 * Run LLM lead analysis for a single payload.
 */
export async function analyzeLead(options: AnalyzeLeadOptions): Promise<AnalyzeLeadOutcome> {
  const provider = resolveActiveProvider(options.providerOverride);
  const payloadJson = JSON.stringify(options.payload ?? {}, null, 2);
  const heuristic =
    options.heuristicSpamScore != null
      ? `\nHeuristic spam score (0-1): ${options.heuristicSpamScore}`
      : '';

  const completion = await provider.complete({
    json: provider.id !== 'anthropic',
    temperature: 0.2,
    maxTokens: 700,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze this lead payload:${heuristic}\n\n${payloadJson}`,
      },
    ],
  });

  const analysis = parseLeadAnalysisJson(completion.content);

  return {
    ...analysis,
    provider: completion.provider,
    model: completion.model,
    raw: completion.raw,
  };
}

/**
 * Merge AI fields into a notification payload (prefixed keys for readability).
 */
export function enrichPayloadWithInsights(
  payload: Record<string, string>,
  insight: LeadAnalysisResult
): Record<string, string> {
  return {
    ...payload,
    ai_summary: insight.summary,
    ai_category: insight.category,
    ai_priority: insight.priority,
    ai_spam_score: String(Math.round(insight.spamScore)),
    ai_sentiment: insight.sentiment,
    ai_intent: insight.estimatedIntent,
    // Convenience mirrors for automation rules / sorting
    category: payload.category || insight.category,
    priority: payload.priority || insight.priority,
  };
}
