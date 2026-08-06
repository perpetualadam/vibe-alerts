import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AiAnalysisJob,
  AiDeliveryContext,
  EnqueueAiAnalysisParams,
  LeadInsightRecord,
} from '@/lib/ai/types';
import type { AnalyzeLeadOutcome } from '@/lib/ai/analyze';

export async function enqueueAiAnalysisJob(
  params: EnqueueAiAnalysisParams
): Promise<AiAnalysisJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_analysis_jobs')
    .insert({
      user_id: params.userId,
      webhook_event_id: params.webhookEventId,
      status: 'pending',
      notify_after: params.notifyAfter,
      payload: params.payload,
      delivery_context: {
        ...(params.deliveryContext || {}),
        heuristicSpamScore: params.heuristicSpamScore ?? null,
      },
      next_attempt_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    if (/ai_analysis_jobs|does not exist|schema cache/i.test(error.message)) {
      return null;
    }
    throw error;
  }

  return mapJob(data);
}

export async function claimDueAiJobs(limit = 10): Promise<AiAnalysisJob[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from('ai_analysis_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', now)
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!due?.length) return [];

  const claimed: AiAnalysisJob[] = [];
  for (const row of due) {
    const { data, error: updError } = await supabase
      .from('ai_analysis_jobs')
      .update({
        status: 'processing',
        attempts: (row.attempts || 0) + 1,
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (!updError && data) claimed.push(mapJob(data));
  }

  return claimed;
}

export async function completeAiJob(
  jobId: string,
  insightId: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('ai_analysis_jobs')
    .update({
      status: 'completed',
      lead_insight_id: insightId,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', jobId);
}

export async function failAiJob(
  job: AiAnalysisJob,
  errorMessage: string
): Promise<'retry' | 'failed'> {
  const supabase = createAdminClient();
  const attempts = job.attempts;
  const maxAttempts = job.maxAttempts || 5;

  if (attempts >= maxAttempts) {
    await supabase
      .from('ai_analysis_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    return 'failed';
  }

  const delaySec = Math.min(900, 15 * 2 ** Math.max(0, attempts - 1));
  await supabase
    .from('ai_analysis_jobs')
    .update({
      status: 'pending',
      error_message: errorMessage,
      next_attempt_at: new Date(Date.now() + delaySec * 1000).toISOString(),
    })
    .eq('id', job.id);

  return 'retry';
}

export async function insertLeadInsight(params: {
  userId: string;
  webhookEventId: string;
  analysis: AnalyzeLeadOutcome;
  heuristicSpamScore?: number | null;
}): Promise<LeadInsightRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('lead_insights')
    .upsert(
      {
        user_id: params.userId,
        webhook_event_id: params.webhookEventId,
        summary: params.analysis.summary,
        category: params.analysis.category,
        priority: params.analysis.priority,
        spam_score: params.analysis.spamScore,
        sentiment: params.analysis.sentiment,
        estimated_intent: params.analysis.estimatedIntent,
        provider: params.analysis.provider,
        model: params.analysis.model,
        raw_response: params.analysis.raw ?? null,
        heuristic_spam_score: params.heuristicSpamScore ?? null,
      },
      { onConflict: 'webhook_event_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return mapInsight(data);
}

export async function listLeadInsights(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ rows: LeadInsightRecord[]; total: number }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const offset = Math.max(0, options.offset ?? 0);
  const supabase = createAdminClient();

  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('lead_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('lead_insights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (error) throw error;
  return { rows: (data || []).map(mapInsight), total: count ?? 0 };
}

export async function getLeadInsightForEvent(
  userId: string,
  webhookEventId: string
): Promise<LeadInsightRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('lead_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('webhook_event_id', webhookEventId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapInsight(data) : null;
}

function mapJob(row: Record<string, unknown>): AiAnalysisJob {
  const ctx = (row.delivery_context || {}) as AiDeliveryContext & {
    heuristicSpamScore?: number | null;
  };
  return {
    id: String(row.id),
    userId: String(row.user_id),
    webhookEventId: String(row.webhook_event_id),
    status: row.status as AiAnalysisJob['status'],
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 5),
    nextAttemptAt: String(row.next_attempt_at),
    notifyAfter: Boolean(row.notify_after),
    payload: (row.payload || {}) as Record<string, string>,
    deliveryContext: ctx,
    errorMessage: row.error_message != null ? String(row.error_message) : null,
    leadInsightId: row.lead_insight_id != null ? String(row.lead_insight_id) : null,
  };
}

function mapInsight(row: Record<string, unknown>): LeadInsightRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    webhookEventId: String(row.webhook_event_id),
    summary: String(row.summary),
    category: String(row.category),
    priority: row.priority as LeadInsightRecord['priority'],
    spamScore: Number(row.spam_score),
    sentiment: row.sentiment as LeadInsightRecord['sentiment'],
    estimatedIntent: String(row.estimated_intent),
    provider: String(row.provider),
    model: String(row.model),
    heuristicSpamScore:
      row.heuristic_spam_score != null ? Number(row.heuristic_spam_score) : null,
    createdAt: String(row.created_at),
  };
}
