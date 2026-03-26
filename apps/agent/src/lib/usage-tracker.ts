/**
 * Usage tracker — logs every LLM call for billing and rate limiting.
 */

import { getServiceClient } from '@levelset/supabase-client';

/** Per-million-token pricing by model */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4-6': { input: 5.0, output: 25.0 },
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
  toolCount?: number;
  toolDurationMs?: number;
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
    ...(params.toolCount !== undefined ? { tool_count: params.toolCount } : {}),
    ...(params.toolDurationMs !== undefined ? { tool_duration_ms: params.toolDurationMs } : {}),
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
