import { NextResponse } from 'next/server';
import { processAiAnalysisQueue } from '@/lib/ai';
import { logger } from '@/lib/logger';

/**
 * Drain the AI analysis job queue.
 * Authorize with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    logger.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = new URL(request.url).searchParams.get('limit');
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 10));
  const result = await processAiAnalysisQueue({ limit });

  return NextResponse.json({
    ok: true,
    ...result,
    at: new Date().toISOString(),
  });
}

export async function POST(request) {
  return GET(request);
}
