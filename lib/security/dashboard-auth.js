import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateMutationRequest } from '@/lib/security/csrf';

/**
 * Require authenticated dashboard user. Optionally enforce CSRF on mutations.
 * @param {Request} request
 * @param {{ csrf?: boolean }} [options]
 */
export async function requireDashboardUser(request, options = {}) {
  if (options.csrf) {
    const csrf = validateMutationRequest(request);
    if (!csrf.ok) {
      return { error: NextResponse.json({ error: csrf.error }, { status: 403 }) };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, supabase };
}
