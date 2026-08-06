import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Skip session work for PWA/static assets (faster mobile loads)
  if (
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/offline'
  ) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isDashboard = pathname.startsWith('/dashboard');
  const isLoginRoot = pathname === '/login' || pathname === '/login/';

  if (isDashboard && !user) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else if (isLoginRoot && user) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  } else if (user && pathname.startsWith('/login/forgot-password')) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
