import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/** POST regenerate webhook token + secret (authenticated) */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const newToken = crypto.randomUUID();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({ webhook_token: newToken })
    .eq('id', auth.user.id)
    .select('webhook_token')
    .single();

  if (profileError) {
    return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 });
  }

  const { data: settings, error: settingsError } = await admin
    .from('user_settings')
    .update({
      webhook_secret: generateHex(32),
      api_key: generateHex(24),
      webhook_token_rotated_at: new Date().toISOString(),
    })
    .eq('user_id', auth.user.id)
    .select('webhook_secret, api_key')
    .single();

  if (settingsError) {
    return NextResponse.json({ error: 'Failed to rotate secrets' }, { status: 500 });
  }

  return NextResponse.json({
    webhook_token: profile.webhook_token,
    webhook_secret: settings.webhook_secret,
    api_key: settings.api_key,
  });
}

function generateHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}
