/**
 * AI Provider — OpenRouter via Vercel AI SDK.
 *
 * Model aliases:
 *   primary    → Sonnet 4.6 (single agent — tool calling + synthesis)
 *   escalation → Opus 4.6 (fallback on primary failure)
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

export const models = customProvider({
  languageModels: {
    primary: openrouter('anthropic/claude-sonnet-4.6'),
    escalation: openrouter('anthropic/claude-opus-4.6'),
  },
});

/** Style instructions for the system prompt */
export const STYLE_INSTRUCTIONS: Record<string, string> = {
  concise:
    'Be concise. Prefer 1-3 sentence responses. Use bullet points for lists. Never repeat the question back. Only output the final answer — no preamble or thinking aloud.',
  brief: 'Be extremely brief. One sentence max. No preamble. Only the final answer.',
  structured:
    'Use structured output. Bullet points, headers where appropriate. No filler text. Only output the final answer.',
};

/** Get style instruction string to inject into system prompt */
export function getStyleInstruction(style: string): string {
  return STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.concise;
}
