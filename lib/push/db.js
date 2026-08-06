/**
 * Persistence for Web Push subscriptions.
 */

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * @param {string} userId
 */
export async function listPushSubscriptions(userId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, enabled, created_at, last_notified_at, user_agent')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} userId
 */
export async function listPushSubscriptionsWithKeys(userId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, enabled')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (error) throw error;
  return data ?? [];
}

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.endpoint
 * @param {string} params.p256dh
 * @param {string} params.auth
 * @param {string} [params.userAgent]
 */
export async function upsertPushSubscription({
  userId,
  endpoint,
  p256dh,
  auth,
  userAgent,
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent || null,
        enabled: true,
      },
      { onConflict: 'endpoint' }
    )
    .select('id, endpoint, enabled, created_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} userId
 * @param {string} endpoint
 */
export async function deletePushSubscription(userId, endpoint) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) throw error;
}

/**
 * @param {string} id
 */
export async function touchPushSubscription(id) {
  const supabase = createAdminClient();
  await supabase
    .from('push_subscriptions')
    .update({ last_notified_at: new Date().toISOString() })
    .eq('id', id);
}

/**
 * @param {string} id
 */
export async function disablePushSubscription(id) {
  const supabase = createAdminClient();
  await supabase.from('push_subscriptions').update({ enabled: false }).eq('id', id);
}
