import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET signing credentials for authenticated test requests.
 * Only available to logged-in user — never expose via public routes.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('webhook_secret, api_key')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
  }

  return NextResponse.json({
    webhook_secret: data.webhook_secret,
    api_key: data.api_key,
  });
}
