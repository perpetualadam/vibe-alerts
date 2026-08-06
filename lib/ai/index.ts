export type {
  AiProviderId,
  AiSettings,
  LeadAnalysisResult,
  LeadInsightRecord,
  LeadPriority,
  LeadSentiment,
  LlmProvider,
} from '@/lib/ai/types';

export { analyzeLead, enrichPayloadWithInsights } from '@/lib/ai/analyze';
export {
  getAiPlatformStatus,
  isAiPlatformConfigured,
  listConfiguredProviders,
  listProviders,
  resolveActiveProvider,
} from '@/lib/ai/providers/registry';
export { getAiSettings, upsertAiSettings } from '@/lib/ai/settings';
export {
  enqueueAndScheduleAiAnalysis,
  processAiAnalysisQueue,
  scheduleAiJobProcessing,
} from '@/lib/ai/queue';
export {
  getLeadInsightForEvent,
  listLeadInsights,
} from '@/lib/ai/db';
