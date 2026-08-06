import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import {
  acceptTeamInvite,
  createBillingTeam,
  getTeamForUser,
  inviteTeamMember,
} from '@/lib/stripe/teams';

export const runtime = 'nodejs';

/** GET current team */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const state = await getTeamForUser(auth.user.id);
  return NextResponse.json(state);
}

/**
 * POST actions: create | invite | accept
 * Body: { action, name?, email?, token? }
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.action === 'create') {
    const result = await createBillingTeam(auth.user.id, body.name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  if (body.action === 'invite') {
    const result = await inviteTeamMember(auth.user.id, body.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  if (body.action === 'accept') {
    const result = await acceptTeamInvite(auth.user.id, body.token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
