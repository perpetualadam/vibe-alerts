/**
 * Persistence helpers for automation_rules.
 */

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * @param {Record<string, unknown>} row
 * @returns {import('./types').AutomationRule}
 */
export function mapRuleRow(row) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: row.description != null ? String(row.description) : undefined,
    enabled: Boolean(row.enabled),
    priority: Number(row.priority ?? 100),
    stopProcessing: Boolean(row.stop_processing),
    conditions: Array.isArray(row.conditions) ? row.conditions : [],
    actions: Array.isArray(row.actions) ? row.actions : [],
  };
}

/**
 * @param {string} userId
 * @param {{ enabledOnly?: boolean }} [options]
 */
export async function listAutomationRules(userId, options = {}) {
  const supabase = createAdminClient();
  let query = supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (options.enabledOnly) {
    query = query.eq('enabled', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRuleRow);
}

/**
 * @param {string} userId
 * @param {Object} rule
 */
export async function createAutomationRule(userId, rule) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      user_id: userId,
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      priority: rule.priority,
      stop_processing: rule.stop_processing,
      conditions: rule.conditions,
      actions: rule.actions,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapRuleRow(data);
}

/**
 * @param {string} userId
 * @param {string} ruleId
 * @param {Object} rule
 */
export async function updateAutomationRule(userId, ruleId, rule) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('automation_rules')
    .update({
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      priority: rule.priority,
      stop_processing: rule.stop_processing,
      conditions: rule.conditions,
      actions: rule.actions,
    })
    .eq('id', ruleId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? mapRuleRow(data) : null;
}

/**
 * @param {string} userId
 * @param {string} ruleId
 * @param {boolean} enabled
 */
export async function setAutomationRuleEnabled(userId, ruleId, enabled) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('automation_rules')
    .update({ enabled: Boolean(enabled) })
    .eq('id', ruleId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? mapRuleRow(data) : null;
}

/**
 * @param {string} userId
 * @param {string} ruleId
 */
export async function deleteAutomationRule(userId, ruleId) {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from('automation_rules')
    .delete({ count: 'exact' })
    .eq('id', ruleId)
    .eq('user_id', userId);

  if (error) throw error;
  return (count ?? 0) > 0;
}
