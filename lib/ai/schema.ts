import { z } from 'zod';

export const leadAnalysisSchema = z.object({
  summary: z.string().min(1).max(2000),
  category: z.string().min(1).max(80),
  priority: z.enum(['Low', 'Medium', 'High']),
  spamScore: z.number().min(0).max(100),
  sentiment: z.enum(['Positive', 'Neutral', 'Negative', 'Mixed']),
  estimatedIntent: z.string().min(1).max(500),
});

export type ParsedLeadAnalysis = z.infer<typeof leadAnalysisSchema>;

/**
 * Parse and validate model JSON into a LeadAnalysisResult shape.
 */
export function parseLeadAnalysisJson(content: string): ParsedLeadAnalysis {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not contain a JSON object');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new Error('Model response JSON was invalid');
  }

  // Accept snake_case variants from models
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (obj.spam_score != null && obj.spamScore == null) obj.spamScore = obj.spam_score;
    if (obj.estimated_intent != null && obj.estimatedIntent == null) {
      obj.estimatedIntent = obj.estimated_intent;
    }
  }

  return leadAnalysisSchema.parse(parsed);
}
