import { analyzeLead, enrichPayloadWithInsights } from '@/lib/ai/analyze';
import {
  claimDueAiJobs,
  completeAiJob,
  enqueueAiAnalysisJob,
  failAiJob,
  insertLeadInsight,
} from '@/lib/ai/db';
import { isAiPlatformConfigured } from '@/lib/ai/providers/registry';
import type { AiAnalysisJob, EnqueueAiAnalysisParams } from '@/lib/ai/types';
import { logger } from '@/lib/logger';

/**
 * Enqueue AI analysis and best-effort schedule immediate processing.
 * Never throws into the webhook hot path.
 */
export async function enqueueAndScheduleAiAnalysis(
  params: EnqueueAiAnalysisParams
): Promise<{ jobId: string | null; deferredNotification: boolean }> {
  if (!isAiPlatformConfigured()) {
    return { jobId: null, deferredNotification: false };
  }

  try {
    const job = await enqueueAiAnalysisJob(params);
    if (!job) {
      return { jobId: null, deferredNotification: false };
    }

    scheduleAiJobProcessing(job.id);

    return {
      jobId: job.id,
      deferredNotification: Boolean(params.notifyAfter),
    };
  } catch (err) {
    logger.warn('Failed to enqueue AI analysis', {
      error: err instanceof Error ? err.message : String(err),
      webhookEventId: params.webhookEventId,
    });
    return { jobId: null, deferredNotification: false };
  }
}

/**
 * Process one or many due jobs (cron + after() worker).
 */
export async function processAiAnalysisQueue(options: {
  limit?: number;
  jobId?: string;
} = {}): Promise<{ processed: number; completed: number; failed: number; retried: number }> {
  let jobs: AiAnalysisJob[] = [];

  if (options.jobId) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('ai_analysis_jobs')
      .select('*')
      .eq('id', options.jobId)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (existing) {
      const { data } = await supabase
        .from('ai_analysis_jobs')
        .update({
          status: 'processing',
          attempts: Number(existing.attempts || 0) + 1,
        })
        .eq('id', options.jobId)
        .select('*')
        .maybeSingle();

      if (data) {
        jobs = [
          {
            id: String(data.id),
            userId: String(data.user_id),
            webhookEventId: String(data.webhook_event_id),
            status: 'processing',
            attempts: Number(data.attempts || 1),
            maxAttempts: Number(data.max_attempts || 5),
            nextAttemptAt: String(data.next_attempt_at),
            notifyAfter: Boolean(data.notify_after),
            payload: (data.payload || {}) as Record<string, string>,
            deliveryContext: (data.delivery_context || {}) as AiAnalysisJob['deliveryContext'],
            errorMessage: null,
            leadInsightId: null,
          },
        ];
      }
    }
  } else {
    jobs = await claimDueAiJobs(options.limit ?? 10);
  }

  let completed = 0;
  let failed = 0;
  let retried = 0;

  for (const job of jobs) {
    try {
      await processOneAiJob(job);
      completed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('AI analysis job failed', { jobId: job.id, error: message });
      const outcome = await failAiJob(job, message);
      if (outcome === 'failed') {
        failed += 1;
        if (job.notifyAfter) {
          await deliverWithoutInsights(job).catch((notifyErr) => {
            logger.error('Fallback notify after AI failure failed', {
              jobId: job.id,
              error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
            });
          });
        }
      } else {
        retried += 1;
      }
    }
  }

  return { processed: jobs.length, completed, failed, retried };
}

async function processOneAiJob(job: AiAnalysisJob): Promise<void> {
  const heuristic =
    typeof job.deliveryContext?.heuristicSpamScore === 'number'
      ? job.deliveryContext.heuristicSpamScore
      : null;

  const analysis = await analyzeLead({
    payload: job.payload,
    heuristicSpamScore: heuristic,
  });

  const insight = await insertLeadInsight({
    userId: job.userId,
    webhookEventId: job.webhookEventId,
    analysis,
    heuristicSpamScore: heuristic,
  });

  if (job.notifyAfter) {
    const { notificationService } = await import('@/lib/notifications/service');
    const enriched = enrichPayloadWithInsights(job.payload, analysis);
    const ctx = job.deliveryContext || {};

    await notificationService.notify({
      userId: job.userId,
      profile: (ctx.profile || {}) as Record<string, unknown>,
      settings: (ctx.settings || {}) as Record<string, unknown>,
      channelConfigs: (ctx.channelConfigs || {}) as Record<
        string,
        { enabled: boolean; config: Record<string, string>; connected_at?: string }
      >,
      payload: enriched,
      webhookEventId: job.webhookEventId,
    });

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    await supabase
      .from('webhook_events')
      .update({
        processing_status: 'completed',
        received_payload: {
          ...enriched,
          _ai_insight_id: insight.id,
        },
      })
      .eq('id', job.webhookEventId);
  } else {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('webhook_events')
      .select('received_payload')
      .eq('id', job.webhookEventId)
      .maybeSingle();

    await supabase
      .from('webhook_events')
      .update({
        received_payload: {
          ...((event?.received_payload as Record<string, unknown>) || {}),
          _ai_insight_id: insight.id,
          _ai_summary: insight.summary,
          _ai_category: insight.category,
          _ai_priority: insight.priority,
        },
      })
      .eq('id', job.webhookEventId);
  }

  await completeAiJob(job.id, insight.id);
  logger.info('AI lead insight stored', {
    jobId: job.id,
    insightId: insight.id,
    provider: insight.provider,
  });
}

async function deliverWithoutInsights(job: AiAnalysisJob): Promise<void> {
  const { notificationService } = await import('@/lib/notifications/service');
  const ctx = job.deliveryContext || {};
  await notificationService.notify({
    userId: job.userId,
    profile: (ctx.profile || {}) as Record<string, unknown>,
    settings: (ctx.settings || {}) as Record<string, unknown>,
    channelConfigs: (ctx.channelConfigs || {}) as Record<
      string,
      { enabled: boolean; config: Record<string, string>; connected_at?: string }
    >,
    payload: job.payload,
    webhookEventId: job.webhookEventId,
  });
}

/**
 * Prefer Next.js `after()` so work continues after the webhook response.
 * Falls back to a detached promise when `after` is unavailable.
 */
export function scheduleAiJobProcessing(jobId: string): void {
  const run = () => {
    processAiAnalysisQueue({ jobId }).catch((err) => {
      logger.warn('Scheduled AI job processing error', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  };

  try {
    // Dynamically require to avoid edge/runtime issues in tests
    const nextServer = require('next/server') as { after?: (fn: () => void) => void };
    if (typeof nextServer.after === 'function') {
      nextServer.after(run);
      return;
    }
  } catch {
    // ignore
  }

  setTimeout(run, 0);
}
