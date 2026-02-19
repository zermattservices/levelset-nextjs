/**
 * AI Provider — OpenRouter via Vercel AI SDK.
 *
 * Replaces the hand-rolled fetch client in llm-clients/openrouter.ts
 * with the AI SDK's @ai-sdk/openai-compatible provider.
 *
 * Model aliases:
 *   primary    → MiniMax M2.5 (~85% of requests)
 *   escalation → Claude Sonnet 4.5 (complex tasks or primary failure)
 *   batch      → Gemini 2.5 Flash (large context, future use)
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider } from 'ai';

const openrouter = createOpenAICompatible({
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://levelset.io',
    'X-Title': 'Levelset Levi',
  },
});

/**
 * Named model aliases for Levi.
 *
 * Usage:
 *   import { models } from './ai-provider.js';
 *   const model = models.languageModel('primary');
 */
export const models = customProvider({
  languageModels: {
    primary: openrouter('minimax/minimax-m2.5'),
    escalation: openrouter('anthropic/claude-sonnet-4.5'),
    batch: openrouter('google/gemini-2.5-flash'),
  },
});

/** Style instructions for the system prompt */
export const STYLE_INSTRUCTIONS: Record<string, string> = {
  concise:
    'Be concise. Prefer 1-3 sentence responses. Use bullet points for lists. Never repeat the question back.',
  brief: 'Be extremely brief. One sentence max. No preamble.',
  structured:
    'Use structured output. Bullet points, headers where appropriate. No filler text.',
};

/** Get style instruction string to inject into system prompt */
export function getStyleInstruction(style: string): string {
  return STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.concise;
}
