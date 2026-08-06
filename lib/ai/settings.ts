import { createAdminClient } from '@/lib/supabase/admin';
import type { AiSettings } from '@/lib/ai/types';

const DEFAULTS: Omit<AiSettings, 'userId'> = {
  enabled: false,
  includeInNotifications: true,
};

export async function getAiSettings(userId: string): Promise<AiSettings> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_settings')
    .select('user_id, enabled, include_in_notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // Table may not exist yet pre-migration — fail closed (AI off)
    if (/ai_settings|does not exist|schema cache/i.test(error.message)) {
      return { userId, ...DEFAULTS };
    }
    throw error;
  }

  if (!data) {
    return { userId, ...DEFAULTS };
  }

  return {
    userId,
    enabled: Boolean(data.enabled),
    includeInNotifications: Boolean(data.include_in_notifications),
  };
}

export async function upsertAiSettings(
  userId: string,
  patch: { enabled?: boolean; includeInNotifications?: boolean }
): Promise<AiSettings> {
  const current = await getAiSettings(userId);
  const next = {
    enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
    includeInNotifications:
      patch.includeInNotifications !== undefined
        ? Boolean(patch.includeInNotifications)
        : current.includeInNotifications,
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_settings')
    .upsert(
      {
        user_id: userId,
        enabled: next.enabled,
        include_in_notifications: next.includeInNotifications,
      },
      { onConflict: 'user_id' }
    )
    .select('user_id, enabled, include_in_notifications')
    .single();

  if (error) throw error;

  return {
    userId: String(data.user_id),
    enabled: Boolean(data.enabled),
    includeInNotifications: Boolean(data.include_in_notifications),
  };
}
