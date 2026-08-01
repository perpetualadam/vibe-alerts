import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** Exchange Supabase auth code (signup, recovery, OAuth) for a session */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }

  const safeNext = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(new URL(safeNext, origin));
}
