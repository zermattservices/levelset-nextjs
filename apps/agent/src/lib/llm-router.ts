/**
 * LLM Router — maps task types to models and response configurations.
 *
 * Primary: MiniMax M2.5 via OpenRouter (85% of requests)
 * Escalation: Claude Sonnet 4.5 via OpenRouter (complex/failed tasks)
 * Batch: Gemini 2.5 Flash via OpenRouter (large context, future use)
 */

import type { TaskType, ResponseConfig } from './types.js';

export const MODELS = {
  primary: 'minimax/minimax-m2.5',
  escalation: 'anthropic/claude-sonnet-4.5',
  batch: 'google/gemini-2.5-flash',
} as const;

const RESPONSE_LIMITS: Record<TaskType, ResponseConfig> = {
  user_chat: { maxTokens: 500, style: 'concise' },
  simple_query: { maxTokens: 300, style: 'concise' },
  tool_orchestration: { maxTokens: 1000, style: 'concise' },
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  concise:
    'Be concise. Prefer 1-3 sentence responses. Use bullet points for lists. Never repeat the question back.',
  brief: 'Be extremely brief. One sentence max. No preamble.',
  structured:
    'Use structured output. Bullet points, headers where appropriate. No filler text.',
};

/** Get the model identifier for a given task type */
export function routeToModel(taskType: TaskType, escalated: boolean): string {
  if (escalated || taskType === 'tool_orchestration') {
    return MODELS.escalation;
  }
  return MODELS.primary;
}

/** Get response config (max tokens, style) for a task type */
export function getResponseConfig(taskType: TaskType): ResponseConfig {
  return RESPONSE_LIMITS[taskType];
}

/** Get style instruction string to inject into system prompt */
export function getStyleInstruction(style: string): string {
  return STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.concise;
}
