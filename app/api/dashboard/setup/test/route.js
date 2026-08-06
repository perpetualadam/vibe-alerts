import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { runWizardConnectionTest } from '@/lib/setup-wizard/service';

export const runtime = 'nodejs';

/**
 * POST — Test website integration connection.
 * Body: { mode?: 'simulate' | 'verify_site' }
 *
 * simulate: posts a platform-tagged test payload through the webhook processor
 * verify_site: confirms a recent inbound webhook from the selected platform
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await runWizardConnectionTest(auth.user.id, {
      mode: body.mode === 'verify_site' ? 'verify_site' : 'simulate',
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          progress: result.progress,
          delivery: result.delivery,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection test failed' },
      { status: 500 }
    );
  }
}
