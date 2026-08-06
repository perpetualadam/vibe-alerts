/**
 * Evaluate automation rules against an inbound webhook context.
 */

/**
 * @param {import('./types').AutomationRule[]} rules
 * @param {import('./types').RuleEvaluationContext} context
 * @returns {import('./types').RuleEvaluationResult}
 */
export function evaluateAutomationRules(rules, context) {
  /** @type {Record<string, string>} */
  let payload = { ...(context.payload || {}) };
  /** @type {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} */
  let channelConfigs = cloneChannelConfigs(context.channelConfigs || {});
  let ignore = false;
  let channelFilterApplied = false;
  let hasSpamScoreCondition = false;

  /** @type {string[]} */
  const matchedRuleIds = [];
  /** @type {string[]} */
  const matchedRuleNames = [];
  /** @type {Array<{ruleId:string,action:string,detail?:string}>} */
  const appliedActions = [];

  const ordered = [...(rules || [])]
    .filter((r) => r && r.enabled !== false)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  for (const rule of ordered) {
    const conditions = rule.conditions || [];
    if (conditions.some((c) => String(c.type).startsWith('spam_score_'))) {
      hasSpamScoreCondition = true;
    }

    if (!conditionsMatch(conditions, payload, context.spamScore)) {
      continue;
    }

    matchedRuleIds.push(rule.id);
    matchedRuleNames.push(rule.name);

    for (const action of rule.actions || []) {
      const result = applyAction(action, payload, channelConfigs);
      payload = result.payload;
      channelConfigs = result.channelConfigs;
      if (result.channelFilterApplied) channelFilterApplied = true;
      if (result.ignore) ignore = true;
      appliedActions.push({
        ruleId: rule.id,
        action: action.type,
        detail: result.detail,
      });
    }

    if (ignore || rule.stopProcessing) {
      break;
    }
  }

  return {
    payload,
    channelConfigs,
    ignore,
    channelFilterApplied,
    hasSpamScoreCondition,
    matchedRuleIds,
    matchedRuleNames,
    appliedActions,
  };
}

/**
 * @param {import('./types').RuleCondition[]} conditions
 * @param {Record<string, string>} payload
 * @param {number|null|undefined} spamScore
 */
export function conditionsMatch(conditions, payload, spamScore) {
  if (!conditions?.length) return false;
  return conditions.every((condition) => matchCondition(condition, payload, spamScore));
}

/**
 * @param {import('./types').RuleCondition} condition
 * @param {Record<string, string>} payload
 * @param {number|null|undefined} spamScore
 */
export function matchCondition(condition, payload, spamScore) {
  const type = condition.type;

  if (type === 'spam_score_gt' || type === 'spam_score_gte') {
    const score = Number(spamScore);
    const threshold = Number(condition.value);
    if (!Number.isFinite(score) || !Number.isFinite(threshold)) return false;
    return type === 'spam_score_gt' ? score > threshold : score >= threshold;
  }

  if (type === 'any_field_contains') {
    const needle = String(condition.value ?? '').toLowerCase();
    if (!needle) return false;
    return Object.values(payload || {}).some((v) => String(v).toLowerCase().includes(needle));
  }

  const fieldValue = getPayloadField(payload, condition.field);
  if (fieldValue === undefined) return false;

  if (type === 'field_eq') {
    return fieldValue.toLowerCase() === String(condition.value ?? '').toLowerCase();
  }
  if (type === 'field_neq') {
    return fieldValue.toLowerCase() !== String(condition.value ?? '').toLowerCase();
  }
  if (type === 'field_contains') {
    return fieldValue.toLowerCase().includes(String(condition.value ?? '').toLowerCase());
  }
  if (type === 'field_gt' || type === 'field_gte') {
    const left = Number(fieldValue);
    const right = Number(condition.value);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    return type === 'field_gt' ? left > right : left >= right;
  }

  return false;
}

/**
 * Case-insensitive field lookup (priority / Priority / PRIORITY).
 * @param {Record<string, string>} payload
 * @param {string} [field]
 */
export function getPayloadField(payload, field) {
  if (!field || !payload) return undefined;
  if (payload[field] != null && String(payload[field]) !== '') {
    return String(payload[field]);
  }
  const target = field.toLowerCase();
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase() === target && value != null && String(value) !== '') {
      return String(value);
    }
  }
  return undefined;
}

/**
 * @param {import('./types').RuleAction} action
 * @param {Record<string, string>} payload
 * @param {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} channelConfigs
 */
function applyAction(action, payload, channelConfigs) {
  /** @type {Record<string, string>} */
  const nextPayload = { ...payload };
  let nextConfigs = channelConfigs;
  let ignore = false;
  let channelFilterApplied = false;
  /** @type {string|undefined} */
  let detail;

  switch (action.type) {
    case 'ignore':
      ignore = true;
      detail = 'drop delivery';
      break;

    case 'set_priority':
      nextPayload.priority = String(action.value ?? '');
      detail = `priority=${action.value}`;
      break;

    case 'set_field':
      if (action.field) {
        nextPayload[action.field] = String(action.value ?? '');
        detail = `${action.field}=${action.value}`;
      }
      break;

    case 'notify_channels': {
      const allowed = new Set((action.channels || []).map((c) => c.toLowerCase()));
      nextConfigs = filterChannelConfigs(channelConfigs, (id) => allowed.has(id));
      channelFilterApplied = true;
      detail = [...allowed].join(',');
      break;
    }

    case 'notify_workspace': {
      const workspace = String(action.workspace || '').toLowerCase();
      nextConfigs = filterChannelConfigs(channelConfigs, (_id, entry) => {
        const tag = String(entry?.config?.workspace ?? entry?.config?.destination ?? '')
          .trim()
          .toLowerCase();
        return Boolean(workspace && tag && tag === workspace);
      });
      channelFilterApplied = true;
      detail = action.workspace;
      break;
    }

    default:
      break;
  }

  return {
    payload: nextPayload,
    channelConfigs: nextConfigs,
    ignore,
    channelFilterApplied,
    detail,
  };
}

/**
 * @param {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} channelConfigs
 * @param {(id: string, entry: import('@/lib/notifications/providers/base').ChannelEntry) => boolean} pred
 */
function filterChannelConfigs(channelConfigs, pred) {
  /** @type {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} */
  const out = {};
  for (const [id, entry] of Object.entries(channelConfigs || {})) {
    if (!pred(id, entry)) continue;
    out[id] = {
      ...entry,
      enabled: true,
      config: { ...(entry.config || {}) },
    };
  }
  return out;
}

/**
 * @param {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} channelConfigs
 */
function cloneChannelConfigs(channelConfigs) {
  /** @type {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} */
  const out = {};
  for (const [id, entry] of Object.entries(channelConfigs || {})) {
    out[id] = {
      enabled: Boolean(entry.enabled),
      config: { ...(entry.config || {}) },
      connected_at: entry.connected_at,
    };
  }
  return out;
}
