import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/monitoring/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/** List unresolved dead-letter notifications */
export async function GET(request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const includeResolved = url.searchParams.get('resolved') === '1';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));

  const supabase = createAdminClient();
  let query = supabase
    .from('notification_dead_letters')
    .select(
      'id, notification_log_id, user_id, channel, payload_preview, error_message, attempt_count, created_at, resolved_at, resolution_notes'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!includeResolved) {
    query = query.is('resolved_at', null);
  }

  const { data, error } = await query;
  if (error) {
    logger.error('DLQ list failed', { error: error.message });
    return NextResponse.json({ error: 'Failed to load dead letters' }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

/** Resolve a dead-letter entry */
export async function POST(request) {
  const auth = await requirePlatformAdmin(request, { csrf: true });
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = String(body?.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const notes = body?.notes != null ? String(body.notes).slice(0, 2000) : null;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notification_dead_letters')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user.id,
      resolution_notes: notes,
    })
    .eq('id', id)
    .is('resolved_at', null)
    .select('id, resolved_at')
    .maybeSingle();

  if (error) {
    logger.error('DLQ resolve failed', { error: error.message, id });
    return NextResponse.json({ error: 'Failed to resolve dead letter' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Dead letter not found or already resolved' }, { status: 404 });
  }

  logger.info('Dead letter resolved', { id, by: auth.user.id });
  return NextResponse.json({ ok: true, item: data });
}
