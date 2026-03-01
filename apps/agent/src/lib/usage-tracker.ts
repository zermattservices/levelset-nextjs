/**
 * Usage tracker — logs every LLM call for billing and rate limiting.
 */

import { getServiceClient } from '@levelset/supabase-client';

/** Per-million-token pricing by model */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'minimax/minimax-m2.5': { input: 0.3, output: 1.2 },
  'anthropic/claude-sonnet-4.5': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4.6': { input: 5.0, output: 25.0 },
  'google/gemini-2.5-flash': { input: 0.3, output: 2.5 },
};

const DEFAULT_RATE_LIMIT_PER_MINUTE = 30;

export interface UsageLogParams {
  orgId: string;
  userId: string;
  conversationId: string;
  model: string;
  tier: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs?: number;
  escalated?: boolean;
  escalationReason?: string;
  // Pipeline-specific fields (orchestrator-worker architecture)
  orchestratorModel?: string;
  orchestratorInputTokens?: number;
  orchestratorOutputTokens?: number;
  orchestratorCostUsd?: number;
  workerModel?: string;
  workerInputTokens?: number;
  workerOutputTokens?: number;
  workerCostUsd?: number;
  toolCount?: number;
  toolDurationMs?: number;
  fallback?: boolean;
}

/**
 * Log a single LLM call to levi_usage_log.
 * Calculates cost from the model pricing table.
 */
export async function logUsage(params: UsageLogParams): Promise<void> {
  const supabase = getServiceClient();

  const pricing = COST_PER_MILLION[params.model] ?? { input: 0, output: 0 };
  const cost =
    (params.inputTokens * pricing.input +
      params.outputTokens * pricing.output) /
    1_000_000;

  // Calculate orchestrator + worker costs if provided
  const orchestratorCost = params.orchestratorCostUsd ?? (
    params.orchestratorModel
      ? ((params.orchestratorInputTokens ?? 0) * (COST_PER_MILLION[params.orchestratorModel]?.input ?? 0) +
         (params.orchestratorOutputTokens ?? 0) * (COST_PER_MILLION[params.orchestratorModel]?.output ?? 0)) / 1_000_000
      : undefined
  );
  const workerCost = params.workerCostUsd ?? (
    params.workerModel
      ? ((params.workerInputTokens ?? 0) * (COST_PER_MILLION[params.workerModel]?.input ?? 0) +
         (params.workerOutputTokens ?? 0) * (COST_PER_MILLION[params.workerModel]?.output ?? 0)) / 1_000_000
      : undefined
  );

  const { error } = await supabase.from('levi_usage_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    conversation_id: params.conversationId,
    model: params.model,
    tier: params.tier,
    task_type: params.taskType,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: cost,
    latency_ms: params.latencyMs ?? null,
    escalated: params.escalated ?? false,
    escalation_reason: params.escalationReason ?? null,
    // Pipeline fields — null for legacy path, populated for orchestrator-worker
    ...(params.orchestratorModel ? {
      orchestrator_model: params.orchestratorModel,
      orchestrator_input_tokens: params.orchestratorInputTokens ?? 0,
      orchestrator_output_tokens: params.orchestratorOutputTokens ?? 0,
      orchestrator_cost_usd: orchestratorCost ?? 0,
    } : {}),
    ...(params.workerModel ? {
      worker_model: params.workerModel,
      worker_input_tokens: params.workerInputTokens ?? 0,
      worker_output_tokens: params.workerOutputTokens ?? 0,
      worker_cost_usd: workerCost ?? 0,
    } : {}),
    ...(params.toolCount !== undefined ? { tool_count: params.toolCount } : {}),
    ...(params.toolDurationMs !== undefined ? { tool_duration_ms: params.toolDurationMs } : {}),
    ...(params.fallback !== undefined ? { fallback: params.fallback } : {}),
  });

  if (error) {
    // Log but don't fail the request — usage tracking is non-critical
    console.error('Failed to log usage:', error);
  }
}

/**
 * Check if the org has exceeded the per-minute rate limit.
 * Returns true if the request should be allowed.
 */
export async function checkRateLimit(orgId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await supabase
    .from('levi_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', oneMinuteAgo);

  if (error) {
    // On error, allow the request (fail open for rate limiting)
    console.error('Rate limit check failed:', error);
    return true;
  }

  return (count ?? 0) < DEFAULT_RATE_LIMIT_PER_MINUTE;
}
