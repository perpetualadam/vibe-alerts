/**
 * Shared types for AI Lead Intelligence.
 */

export type AiProviderId = 'openai' | 'anthropic' | 'groq' | 'grok';

export type LeadPriority = 'Low' | 'Medium' | 'High';

export type LeadSentiment = 'Positive' | 'Neutral' | 'Negative' | 'Mixed';

export interface LeadAnalysisResult {
  summary: string;
  category: string;
  priority: LeadPriority;
  /** 0–100 (higher = more likely spam) */
  spamScore: number;
  sentiment: LeadSentiment;
  estimatedIntent: string;
}

export interface LeadInsightRecord extends LeadAnalysisResult {
  id: string;
  userId: string;
  webhookEventId: string;
  provider: AiProviderId | string;
  model: string;
  heuristicSpamScore: number | null;
  createdAt: string;
}

export interface AiSettings {
  userId: string;
  enabled: boolean;
  includeInNotifications: boolean;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiChatMessage[];
  /** Prefer JSON object responses when the provider supports it */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AiCompletionResponse {
  content: string;
  provider: AiProviderId;
  model: string;
  raw?: unknown;
}

export interface LlmProvider {
  readonly id: AiProviderId;
  readonly label: string;
  isConfigured(): boolean;
  defaultModel(): string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}

export type AiJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AiAnalysisJob {
  id: string;
  userId: string;
  webhookEventId: string;
  status: AiJobStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  notifyAfter: boolean;
  payload: Record<string, string>;
  deliveryContext: AiDeliveryContext;
  errorMessage: string | null;
  leadInsightId: string | null;
}

export interface AiDeliveryContext {
  channelConfigs?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  heuristicSpamScore?: number | null;
}

export interface EnqueueAiAnalysisParams {
  userId: string;
  webhookEventId: string;
  payload: Record<string, string>;
  notifyAfter: boolean;
  deliveryContext?: AiDeliveryContext;
  heuristicSpamScore?: number | null;
}
