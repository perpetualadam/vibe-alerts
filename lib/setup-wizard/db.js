/**
 * Persistence for Website Integration Wizard progress.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_WIZARD_STEPS } from '@/lib/setup-wizard/platforms';

/**
 * @param {Record<string, unknown>|null} row
 */
export function toPublicWizardProgress(row) {
  const steps = {
    ...DEFAULT_WIZARD_STEPS,
    ...(row?.steps && typeof row.steps === 'object' ? row.steps : {}),
  };

  return {
    platform: row?.platform ? String(row.platform) : null,
    steps,
    lastTestStatus: row?.last_test_status ? String(row.last_test_status) : null,
    lastTestAt: row?.last_test_at ? String(row.last_test_at) : null,
    lastTestEventId: row?.last_test_event_id ? String(row.last_test_event_id) : null,
    lastTestMessage: row?.last_test_message ? String(row.last_test_message) : null,
    completedAt: row?.completed_at ? String(row.completed_at) : null,
  };
}

/**
 * @param {string} userId
 */
export async function getWizardProgress(userId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('integration_wizard_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return toPublicWizardProgress(data);
}

/**
 * @param {string} userId
 * @param {Object} patch
 */
export async function upsertWizardProgress(userId, patch) {
  const supabase = createAdminClient();
  const existing = await supabase
    .from('integration_wizard_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const prev = existing.data;
  const nextSteps = {
    ...DEFAULT_WIZARD_STEPS,
    ...(prev?.steps && typeof prev.steps === 'object' ? prev.steps : {}),
    ...(patch.steps && typeof patch.steps === 'object' ? patch.steps : {}),
  };

  const row = {
    user_id: userId,
    platform: patch.platform !== undefined ? patch.platform : prev?.platform ?? null,
    steps: nextSteps,
    last_test_status:
      patch.last_test_status !== undefined
        ? patch.last_test_status
        : prev?.last_test_status ?? null,
    last_test_at:
      patch.last_test_at !== undefined ? patch.last_test_at : prev?.last_test_at ?? null,
    last_test_event_id:
      patch.last_test_event_id !== undefined
        ? patch.last_test_event_id
        : prev?.last_test_event_id ?? null,
    last_test_message:
      patch.last_test_message !== undefined
        ? patch.last_test_message
        : prev?.last_test_message ?? null,
    completed_at:
      patch.completed_at !== undefined ? patch.completed_at : prev?.completed_at ?? null,
  };

  const { data, error } = await supabase
    .from('integration_wizard_progress')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return toPublicWizardProgress(data);
}
