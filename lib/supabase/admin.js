import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

/**
 * Service-role Supabase client for API routes and webhooks.
 * Bypasses RLS — use only in trusted server-side code.
 */
export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
