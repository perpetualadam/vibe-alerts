import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import {
  listAutomationRules,
  createAutomationRule,
  validateAutomationRuleInput,
  RULE_TEMPLATES,
  parseRulePrompt,
} from '@/lib/automation';

/** GET automation rules + templates */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  try {
    const rules = await listAutomationRules(auth.user.id);
    return NextResponse.json({
      rules,
      templates: RULE_TEMPLATES,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to load rules' }, { status: 500 });
  }
}

/**
 * POST create a rule, or parse a natural-language prompt.
 * Body: rule fields | { action: 'parse', prompt } | { action: 'from_template', templateId }
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body?.action === 'parse') {
    const parsed = parseRulePrompt(body.prompt);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    return NextResponse.json({ draft: parsed.draft });
  }

  if (body?.action === 'from_template') {
    const template = RULE_TEMPLATES.find((t) => t.id === body.templateId);
    if (!template) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    }
    const { templateToDraft } = await import('@/lib/automation/templates');
    const draft = templateToDraft(template);
    const validated = validateAutomationRuleInput(draft);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    try {
      const rule = await createAutomationRule(auth.user.id, validated.rule);
      return NextResponse.json({ rule }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: err.message || 'Failed to create rule' }, { status: 500 });
    }
  }

  const validated = validateAutomationRuleInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const rule = await createAutomationRule(auth.user.id, validated.rule);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to create rule' }, { status: 500 });
  }
}
