/**
 * OpenRouter LLM client.
 *
 * Uses the OpenAI-compatible API at https://openrouter.ai/api/v1/chat/completions.
 * No SDK dependency — Node 20 native fetch.
 */

import type { ChatMessage, LLMResponse, ToolCall, ToolDefinition, TaskType } from '../types.js';
import { routeToModel } from '../llm-router.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  max_tokens: number;
  temperature?: number;
}

interface OpenRouterChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Call OpenRouter with a specific model */
export async function callOpenRouter(params: {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  maxTokens: number;
  temperature?: number;
}): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable');
  }

  const body: OpenRouterRequest = {
    model: params.model,
    messages: params.messages,
    max_tokens: params.maxTokens,
    temperature: params.temperature ?? 0.3,
  };

  // Only include tools if provided and non-empty
  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
  }

  const startTime = Date.now();

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://levelset.io',
      'X-Title': 'Levelset Levi',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const latencyMs = Date.now() - startTime;

  if (!data.choices || data.choices.length === 0) {
    throw new Error('OpenRouter returned no choices');
  }

  const choice = data.choices[0];
  const toolCalls: ToolCall[] | null = choice.message.tool_calls
    ? choice.message.tool_calls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }))
    : null;

  return {
    content: choice.message.content,
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
    model: data.model ?? params.model,
    finishReason: choice.finish_reason ?? 'stop',
  };
}

/** Stream OpenRouter response as SSE chunks. Yields content deltas. */
export async function streamOpenRouter(params: {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
}): Promise<ReadableStream<string>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable');
  }

  const body = {
    model: params.model,
    messages: params.messages,
    max_tokens: params.maxTokens,
    temperature: params.temperature ?? 0.3,
    stream: true,
  };

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://levelset.io',
      'X-Title': 'Levelset Levi',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('OpenRouter returned no body for stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          controller.close();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            controller.enqueue(delta);
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    },
  });
}

/**
 * Call with automatic escalation.
 *
 * 1. Try primary model (MiniMax M2.5)
 * 2. On failure, escalate to Claude Sonnet 4.5
 * 3. On failure, throw
 */
export async function callWithEscalation(params: {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  maxTokens: number;
  taskType: TaskType;
}): Promise<LLMResponse & { escalated: boolean; latencyMs: number }> {
  const primaryModel = routeToModel(params.taskType, false);
  const startTime = Date.now();

  try {
    const response = await callOpenRouter({
      model: primaryModel,
      messages: params.messages,
      tools: params.tools,
      maxTokens: params.maxTokens,
    });
    return {
      ...response,
      escalated: false,
      latencyMs: Date.now() - startTime,
    };
  } catch (primaryError) {
    console.warn(`Primary model failed (${primaryModel}):`, primaryError);

    // Escalation: Claude Sonnet 4.5
    const escalationModel = routeToModel(params.taskType, true);
    try {
      const response = await callOpenRouter({
        model: escalationModel,
        messages: params.messages,
        tools: params.tools,
        maxTokens: params.maxTokens,
      });
      return {
        ...response,
        escalated: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (escalationError) {
      console.error(`Escalation model failed (${escalationModel}):`, escalationError);
      throw escalationError;
    }
  }
}
