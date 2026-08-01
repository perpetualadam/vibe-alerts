import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * GET signing credentials for authenticated test requests.
 * Only available to logged-in user — never expose via public routes.
 */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from('user_settings')
    .select('webhook_secret, api_key')
    .eq('user_id', auth.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
  }

  return NextResponse.json({
    webhook_secret: data.webhook_secret,
    api_key: data.api_key,
  });
}
