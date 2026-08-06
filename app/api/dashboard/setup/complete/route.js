import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { completeWizard } from '@/lib/setup-wizard/service';

export const runtime = 'nodejs';

/** POST — Mark the integration wizard complete (requires passed connection test). */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  try {
    const result = await completeWizard(auth.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to complete setup wizard' }, { status: 500 });
  }
}
