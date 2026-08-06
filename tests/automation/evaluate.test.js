import { describe, expect, it } from 'vitest';
import {
  evaluateAutomationRules,
  matchCondition,
  getPayloadField,
} from '@/lib/automation/evaluate';
import { parseRulePrompt, RULE_TEMPLATES } from '@/lib/automation/templates';
import { validateAutomationRuleInput } from '@/lib/automation/validate';

describe('automation rule evaluation', () => {
  const configs = {
    whatsapp: { enabled: true, config: { phone: '+15551212' } },
    teams: { enabled: true, config: { webhook_url: 'https://example.com/teams', workspace: 'Sales' } },
    telegram: { enabled: true, config: { chat_id: '1' } },
    slack: { enabled: true, config: { webhook_url: 'https://example.com/slack', workspace: 'Sales' } },
  };

  it('routes High priority to WhatsApp and Teams only', () => {
    const rules = [
      {
        id: 'r1',
        name: 'High priority',
        enabled: true,
        priority: 10,
        stopProcessing: true,
        conditions: [{ type: 'field_eq', field: 'priority', value: 'High' }],
        actions: [{ type: 'notify_channels', channels: ['whatsapp', 'teams'] }],
      },
    ];

    const result = evaluateAutomationRules(rules, {
      payload: { priority: 'High', message: 'Hello' },
      spamScore: 0.1,
      channelConfigs: configs,
    });

    expect(result.ignore).toBe(false);
    expect(Object.keys(result.channelConfigs).sort()).toEqual(['teams', 'whatsapp']);
    expect(result.matchedRuleIds).toEqual(['r1']);
  });

  it('ignores when spam score > 80%', () => {
    const rules = [
      {
        id: 'r2',
        name: 'Spam gate',
        enabled: true,
        priority: 1,
        stopProcessing: true,
        conditions: [{ type: 'spam_score_gt', value: 0.8 }],
        actions: [{ type: 'ignore' }],
      },
    ];

    const result = evaluateAutomationRules(rules, {
      payload: { message: 'buy now' },
      spamScore: 0.91,
      channelConfigs: configs,
    });

    expect(result.ignore).toBe(true);
    expect(result.hasSpamScoreCondition).toBe(true);
  });

  it('notifies Sales workspace channels when category is Sales', () => {
    const rules = [
      {
        id: 'r3',
        name: 'Sales',
        enabled: true,
        priority: 20,
        stopProcessing: true,
        conditions: [{ type: 'field_eq', field: 'category', value: 'Sales' }],
        actions: [{ type: 'notify_workspace', workspace: 'Sales' }],
      },
    ];

    const result = evaluateAutomationRules(rules, {
      payload: { category: 'Sales', Name: 'Ada' },
      spamScore: 0,
      channelConfigs: configs,
    });

    expect(Object.keys(result.channelConfigs).sort()).toEqual(['slack', 'teams']);
  });

  it('marks priority Critical when message contains urgent', () => {
    const rules = [
      {
        id: 'r4',
        name: 'Urgent',
        enabled: true,
        priority: 30,
        stopProcessing: false,
        conditions: [{ type: 'field_contains', field: 'message', value: 'urgent' }],
        actions: [{ type: 'set_priority', value: 'Critical' }],
      },
    ];

    const result = evaluateAutomationRules(rules, {
      payload: { message: 'This is URGENT please call' },
      spamScore: 0,
      channelConfigs: configs,
    });

    expect(result.payload.priority).toBe('Critical');
  });

  it('looks up payload fields case-insensitively', () => {
    expect(getPayloadField({ Priority: 'High' }, 'priority')).toBe('High');
    expect(matchCondition({ type: 'field_eq', field: 'Priority', value: 'high' }, { priority: 'High' })).toBe(
      true
    );
  });
});

describe('rule templates and prompt parsing', () => {
  it('ships the four Prompt 15 templates', () => {
    expect(RULE_TEMPLATES.map((t) => t.id)).toEqual([
      'high_priority_whatsapp_teams',
      'spam_score_ignore',
      'sales_workspace',
      'urgent_critical',
    ]);
    for (const template of RULE_TEMPLATES) {
      const validated = validateAutomationRuleInput({
        name: template.name,
        description: template.description,
        enabled: true,
        priority: template.priority,
        stop_processing: template.stopProcessing,
        conditions: template.conditions,
        actions: template.actions,
      });
      expect(validated.ok).toBe(true);
    }
  });

  it('parses the example English prompts', () => {
    const samples = [
      'If priority is High, send to WhatsApp and Teams.',
      'If spam score > 80%, ignore.',
      'If category is Sales, notify the Sales workspace.',
      "If message contains 'urgent', mark as Critical.",
    ];
    for (const sample of samples) {
      const parsed = parseRulePrompt(sample);
      expect(parsed.ok).toBe(true);
      expect(parsed.draft.conditions.length).toBeGreaterThan(0);
      expect(parsed.draft.actions.length).toBeGreaterThan(0);
    }
  });
});
