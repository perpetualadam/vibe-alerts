import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { isPlatformAdmin } from '@/lib/monitoring/admin';

/** Whether the current user is a platform operator */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const ok = await isPlatformAdmin(auth.user.id, auth.user.email);
  return NextResponse.json({ isPlatformAdmin: ok });
}
