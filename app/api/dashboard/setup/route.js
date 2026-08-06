import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import {
  getSetupWizardStatus,
  markWizardStep,
  selectWizardPlatform,
} from '@/lib/setup-wizard/service';

export const runtime = 'nodejs';

/** GET wizard status, platforms, credentials, checklist progress */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const status = await getSetupWizardStatus(auth.user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: 'Failed to load setup wizard' }, { status: 500 });
  }
}

/**
 * PUT — update wizard progress.
 * Body: { action: 'select_platform'|'mark_step', platform?, step? }
 */
export async function PUT(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (body.action === 'select_platform') {
      const result = await selectWizardPlatform(auth.user.id, String(body.platform || ''));
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result);
    }

    if (body.action === 'mark_step') {
      const result = await markWizardStep(auth.user.id, body.step);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update setup wizard' }, { status: 500 });
  }
}
