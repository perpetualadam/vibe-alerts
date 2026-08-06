/**
 * Platform admin authorization for ops / monitoring UI.
 */

import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * @param {string} email
 */
export function isEmailPlatformAdmin(email) {
  const raw = process.env.PLATFORM_ADMIN_EMAILS || '';
  const allow = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email || allow.length === 0) return false;
  return allow.includes(String(email).toLowerCase());
}

/**
 * @param {string} userId
 * @param {string} [email]
 */
export async function isPlatformAdmin(userId, email) {
  if (email && isEmailPlatformAdmin(email)) return true;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('is_platform_admin, email')
    .eq('id', userId)
    .maybeSingle();
  if (data?.is_platform_admin) return true;
  if (data?.email && isEmailPlatformAdmin(data.email)) return true;
  return false;
}

/**
 * @param {Request} request
 * @param {{ csrf?: boolean }} [options]
 */
export async function requirePlatformAdmin(request, options = {}) {
  const auth = await requireDashboardUser(request, options);
  if (auth.error) return auth;

  const ok = await isPlatformAdmin(auth.user.id, auth.user.email);
  if (!ok) {
    return {
      error: NextResponse.json({ error: 'Platform admin access required' }, { status: 403 }),
    };
  }

  return auth;
}
