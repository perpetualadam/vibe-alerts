/**
 * Starter templates + lightweight natural-language → rule parsing
 * for the Prompt 15 example phrases (no hosted LLM required).
 */

/** @type {Array<{id:string,name:string,description:string,prompt:string,priority:number,stopProcessing:boolean,conditions:import('./types').RuleCondition[],actions:import('./types').RuleAction[]}>} */
export const RULE_TEMPLATES = [
  {
    id: 'high_priority_whatsapp_teams',
    name: 'High priority → WhatsApp + Teams',
    description: 'If priority is High, send to WhatsApp and Teams.',
    prompt: 'If priority is High, send to WhatsApp and Teams.',
    priority: 10,
    stopProcessing: true,
    conditions: [{ type: 'field_eq', field: 'priority', value: 'High' }],
    actions: [{ type: 'notify_channels', channels: ['whatsapp', 'teams'] }],
  },
  {
    id: 'spam_score_ignore',
    name: 'High spam score → ignore',
    description: 'If spam score > 80%, ignore.',
    prompt: 'If spam score > 80%, ignore.',
    priority: 1,
    stopProcessing: true,
    conditions: [{ type: 'spam_score_gt', value: 0.8 }],
    actions: [{ type: 'ignore' }],
  },
  {
    id: 'sales_workspace',
    name: 'Sales category → Sales workspace',
    description: 'If category is Sales, notify the Sales workspace.',
    prompt: 'If category is Sales, notify the Sales workspace.',
    priority: 20,
    stopProcessing: true,
    conditions: [{ type: 'field_eq', field: 'category', value: 'Sales' }],
    actions: [{ type: 'notify_workspace', workspace: 'Sales' }],
  },
  {
    id: 'urgent_critical',
    name: 'Urgent message → Critical',
    description: "If message contains 'urgent', mark as Critical.",
    prompt: "If message contains 'urgent', mark as Critical.",
    priority: 30,
    stopProcessing: false,
    conditions: [{ type: 'field_contains', field: 'message', value: 'urgent' }],
    actions: [{ type: 'set_priority', value: 'Critical' }],
  },
];

/**
 * Best-effort parse of short English rule prompts into a draft rule.
 * @param {string} text
 * @returns {{ ok: true, draft: Object } | { ok: false, error: string }}
 */
export function parseRulePrompt(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, error: 'Describe a rule first' };

  const normalized = raw.replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();

  // Exact / near-exact template match
  for (const template of RULE_TEMPLATES) {
    if (lower === template.prompt.toLowerCase() || lower.includes(template.description.toLowerCase())) {
      return {
        ok: true,
        draft: templateToDraft(template),
      };
    }
  }

  /** @type {import('./types').RuleCondition[]} */
  const conditions = [];
  /** @type {import('./types').RuleAction[]} */
  const actions = [];
  let stopProcessing = false;
  let priority = 50;

  // Spam score
  const spamMatch = lower.match(/spam\s*score\s*(>|>=|greater than)\s*(\d+(?:\.\d+)?)\s*%?/);
  if (spamMatch) {
    let threshold = Number(spamMatch[2]);
    if (threshold > 1) threshold = threshold / 100;
    conditions.push({
      type: spamMatch[1].includes('=') ? 'spam_score_gte' : 'spam_score_gt',
      value: threshold,
    });
    priority = 1;
  }

  // field is value
  const eqMatch = normalized.match(/if\s+(\w+)\s+is\s+['"]?([^,'".]+)['"]?/i);
  if (eqMatch && !spamMatch) {
    conditions.push({
      type: 'field_eq',
      field: eqMatch[1],
      value: eqMatch[2].trim(),
    });
  }

  // field contains 'value'
  const containsMatch = normalized.match(
    /if\s+(\w+)\s+contains\s+['"]([^'"]+)['"]/i
  );
  if (containsMatch) {
    conditions.push({
      type: 'field_contains',
      field: containsMatch[1],
      value: containsMatch[2],
    });
  }

  // ignore
  if (/\bignore\b|\bdrop\b|\bskip\b/.test(lower)) {
    actions.push({ type: 'ignore' });
    stopProcessing = true;
  }

  // mark as X / set priority
  const markMatch = normalized.match(/mark\s+as\s+['"]?([A-Za-z0-9_-]+)['"]?/i);
  if (markMatch) {
    actions.push({ type: 'set_priority', value: markMatch[1] });
  }

  // notify workspace
  const workspaceMatch = normalized.match(
    /notify\s+(?:the\s+)?['"]?([A-Za-z0-9_-]+)['"]?\s+workspace/i
  );
  if (workspaceMatch) {
    actions.push({ type: 'notify_workspace', workspace: workspaceMatch[1] });
    stopProcessing = true;
  }

  // send to channels
  const sendMatch = normalized.match(/send\s+to\s+(.+?)(?:\.|$)/i);
  if (sendMatch) {
    const channels = sendMatch[1]
      .split(/,| and /i)
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, ''))
      .map((s) => (s === 'microsoftteams' ? 'teams' : s))
      .filter((s) =>
        ['telegram', 'email', 'whatsapp', 'slack', 'teams', 'discord'].includes(s)
      );
    if (channels.length) {
      actions.push({ type: 'notify_channels', channels });
      stopProcessing = true;
    }
  }

  if (!conditions.length || !actions.length) {
    return {
      ok: false,
      error:
        'Could not parse that rule. Try a template, or phrases like: If priority is High, send to WhatsApp and Teams.',
    };
  }

  return {
    ok: true,
    draft: {
      name: normalized.length > 80 ? `${normalized.slice(0, 77)}…` : normalized,
      description: normalized,
      enabled: true,
      priority,
      stop_processing: stopProcessing,
      conditions,
      actions,
    },
  };
}

/**
 * @param {(typeof RULE_TEMPLATES)[number]} template
 */
export function templateToDraft(template) {
  return {
    name: template.name,
    description: template.description,
    enabled: true,
    priority: template.priority,
    stop_processing: template.stopProcessing,
    conditions: template.conditions,
    actions: template.actions,
  };
}
