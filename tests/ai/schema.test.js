import { describe, expect, it } from 'vitest';
import { parseLeadAnalysisJson } from '@/lib/ai/schema';
import { enrichPayloadWithInsights } from '@/lib/ai/analyze';

describe('AI lead analysis schema', () => {
  it('parses a clean JSON object', () => {
    const result = parseLeadAnalysisJson(
      JSON.stringify({
        summary: 'Ada asked about pricing for a sales team.',
        category: 'Sales',
        priority: 'High',
        spamScore: 12,
        sentiment: 'Positive',
        estimatedIntent: 'Request a demo',
      })
    );
    expect(result.priority).toBe('High');
    expect(result.spamScore).toBe(12);
  });

  it('accepts fenced JSON and snake_case keys', () => {
    const result = parseLeadAnalysisJson(`\`\`\`json
{
  "summary": "Support request about billing.",
  "category": "Support",
  "priority": "Medium",
  "spam_score": 8,
  "sentiment": "Neutral",
  "estimated_intent": "Resolve invoice issue"
}
\`\`\``);
    expect(result.spamScore).toBe(8);
    expect(result.estimatedIntent).toBe('Resolve invoice issue');
  });

  it('rejects invalid priority values', () => {
    expect(() =>
      parseLeadAnalysisJson(
        JSON.stringify({
          summary: 'x',
          category: 'Other',
          priority: 'Critical',
          spamScore: 1,
          sentiment: 'Neutral',
          estimatedIntent: 'Unknown',
        })
      )
    ).toThrow();
  });
});

describe('enrichPayloadWithInsights', () => {
  it('adds ai_* fields for notifications', () => {
    const enriched = enrichPayloadWithInsights(
      { Name: 'Ada', Message: 'Hello' },
      {
        summary: 'Intro lead',
        category: 'Sales',
        priority: 'High',
        spamScore: 5,
        sentiment: 'Positive',
        estimatedIntent: 'Learn more',
      }
    );
    expect(enriched.ai_summary).toBe('Intro lead');
    expect(enriched.ai_priority).toBe('High');
    expect(enriched.priority).toBe('High');
    expect(enriched.Name).toBe('Ada');
  });
});
