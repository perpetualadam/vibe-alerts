/**
 * Validate automation rule payloads from the dashboard API.
 */

const CONDITION_TYPES = new Set([
  'field_eq',
  'field_neq',
  'field_contains',
  'field_gt',
  'field_gte',
  'spam_score_gt',
  'spam_score_gte',
  'any_field_contains',
]);

const ACTION_TYPES = new Set([
  'notify_channels',
  'notify_workspace',
  'ignore',
  'set_field',
  'set_priority',
]);

const KNOWN_CHANNELS = new Set([
  'telegram',
  'email',
  'whatsapp',
  'slack',
  'teams',
  'discord',
]);

/**
 * @param {unknown} input
 * @returns {{ ok: true, rule: Object } | { ok: false, error: string }}
 */
export function validateAutomationRuleInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Invalid rule body' };
  }

  const body = /** @type {Record<string, unknown>} */ (input);
  const name = String(body.name ?? '').trim();
  if (!name || name.length > 120) {
    return { ok: false, error: 'name is required (max 120 chars)' };
  }

  const description =
    body.description != null ? String(body.description).trim().slice(0, 500) : '';

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  const priority = clampInt(body.priority, 100, 0, 10000);
  const stopProcessing = Boolean(body.stop_processing ?? body.stopProcessing);

  const conditionsResult = normalizeConditions(body.conditions);
  if (!conditionsResult.ok) return conditionsResult;

  const actionsResult = normalizeActions(body.actions);
  if (!actionsResult.ok) return actionsResult;

  if (conditionsResult.conditions.length === 0) {
    return { ok: false, error: 'At least one condition is required' };
  }
  if (actionsResult.actions.length === 0) {
    return { ok: false, error: 'At least one action is required' };
  }

  return {
    ok: true,
    rule: {
      name,
      description: description || null,
      enabled,
      priority,
      stop_processing: stopProcessing,
      conditions: conditionsResult.conditions,
      actions: actionsResult.actions,
    },
  };
}

/**
 * @param {unknown} raw
 */
function normalizeConditions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'conditions must be a non-empty array' };
  }
  if (raw.length > 20) {
    return { ok: false, error: 'Too many conditions (max 20)' };
  }

  /** @type {import('./types').RuleCondition[]} */
  const conditions = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid condition' };
    }
    const c = /** @type {Record<string, unknown>} */ (item);
    const type = String(c.type || '').trim();
    if (!CONDITION_TYPES.has(type)) {
      return { ok: false, error: `Unknown condition type: ${type}` };
    }

    if (type.startsWith('spam_score_')) {
      const value = Number(c.value);
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        return { ok: false, error: 'spam score conditions need a value between 0 and 1' };
      }
      conditions.push({ type: /** @type {any} */ (type), value });
      continue;
    }

    if (type === 'any_field_contains') {
      const value = String(c.value ?? '').trim();
      if (!value) return { ok: false, error: 'any_field_contains needs a value' };
      conditions.push({ type, value: value.slice(0, 200) });
      continue;
    }

    const field = String(c.field ?? '').trim();
    if (!field) return { ok: false, error: `${type} needs a field` };
    const value = c.value;
    if (value === undefined || value === null || String(value).trim() === '') {
      return { ok: false, error: `${type} needs a value` };
    }

    if (type === 'field_gt' || type === 'field_gte') {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return { ok: false, error: `${type} value must be numeric` };
      }
      conditions.push({
        type: /** @type {any} */ (type),
        field: field.slice(0, 80),
        value: num,
      });
      continue;
    }

    conditions.push({
      type: /** @type {any} */ (type),
      field: field.slice(0, 80),
      value: String(value).slice(0, 500),
    });
  }

  return { ok: true, conditions };
}

/**
 * @param {unknown} raw
 */
function normalizeActions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'actions must be a non-empty array' };
  }
  if (raw.length > 20) {
    return { ok: false, error: 'Too many actions (max 20)' };
  }

  /** @type {import('./types').RuleAction[]} */
  const actions = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid action' };
    }
    const a = /** @type {Record<string, unknown>} */ (item);
    const type = String(a.type || '').trim();
    if (!ACTION_TYPES.has(type)) {
      return { ok: false, error: `Unknown action type: ${type}` };
    }

    if (type === 'ignore') {
      actions.push({ type });
      continue;
    }

    if (type === 'notify_channels') {
      const channels = Array.isArray(a.channels)
        ? a.channels.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
        : [];
      if (channels.length === 0) {
        return { ok: false, error: 'notify_channels needs at least one channel' };
      }
      for (const ch of channels) {
        if (!KNOWN_CHANNELS.has(ch)) {
          return { ok: false, error: `Unknown channel: ${ch}` };
        }
      }
      actions.push({ type, channels: [...new Set(channels)] });
      continue;
    }

    if (type === 'notify_workspace') {
      const workspace = String(a.workspace ?? a.value ?? '').trim();
      if (!workspace) return { ok: false, error: 'notify_workspace needs a workspace name' };
      actions.push({ type, workspace: workspace.slice(0, 80) });
      continue;
    }

    if (type === 'set_priority') {
      const value = String(a.value ?? '').trim();
      if (!value) return { ok: false, error: 'set_priority needs a value' };
      actions.push({ type, value: value.slice(0, 80) });
      continue;
    }

    if (type === 'set_field') {
      const field = String(a.field ?? '').trim();
      const value = String(a.value ?? '').trim();
      if (!field || !value) return { ok: false, error: 'set_field needs field and value' };
      actions.push({ type, field: field.slice(0, 80), value: value.slice(0, 500) });
      continue;
    }
  }

  return { ok: true, actions };
}

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
