import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import {
  updateAutomationRule,
  setAutomationRuleEnabled,
  deleteAutomationRule,
  validateAutomationRuleInput,
} from '@/lib/automation';

/** PATCH update or toggle a rule */
export async function PATCH(request, { params }) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const resolved = await params;
  const ruleId = String(resolved?.id || '').trim();
  if (!ruleId) {
    return NextResponse.json({ error: 'Rule id required' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body?.action === 'toggle' || (body.enabled !== undefined && body.name === undefined)) {
      const rule = await setAutomationRuleEnabled(auth.user.id, ruleId, Boolean(body.enabled));
      if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
      return NextResponse.json({ rule });
    }

    const validated = validateAutomationRuleInput(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const rule = await updateAutomationRule(auth.user.id, ruleId, validated.rule);
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to update rule' }, { status: 500 });
  }
}

/** DELETE a rule */
export async function DELETE(request, { params }) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const ruleId = String(params?.id || '').trim();
  if (!ruleId) {
    return NextResponse.json({ error: 'Rule id required' }, { status: 400 });
  }

  try {
    const ok = await deleteAutomationRule(auth.user.id, ruleId);
    if (!ok) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to delete rule' }, { status: 500 });
  }
}
