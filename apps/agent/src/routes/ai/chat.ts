/**
 * Chat endpoint — main orchestrator for Levi AI conversations.
 *
 * Flow:
 * 1. Validate & parse request
 * 2. Rate limit check
 * 3. Get or create conversation
 * 4. Persist user message
 * 5. Load conversation history
 * 6. Build LLM message array (system prompt + history)
 * 7. Call LLM with tools via OpenRouter
 * 8. Tool call loop (max 5 iterations)
 * 9. Persist assistant response
 * 10. Log usage
 * 11. Return { message } matching mobile contract
 */

import { Hono } from 'hono';
import { isLevelsetAdmin } from '@levelset/permissions';
import type { UserContext, ChatMessage } from '../../lib/types.js';
import { callWithEscalation } from '../../lib/llm-clients/openrouter.js';
import { getResponseConfig } from '../../lib/llm-router.js';
import { buildSystemPrompt } from '../../lib/prompts.js';
import {
  getOrCreateConversation,
  loadConversationHistory,
  persistMessage,
} from '../../lib/conversation-manager.js';
import { logUsage, checkRateLimit } from '../../lib/usage-tracker.js';
import { TOOL_DEFINITIONS, executeTool } from '../../tools/index.js';

const MAX_TOOL_ITERATIONS = 5;

export const chatRoute = new Hono();

chatRoute.post('/', async (c) => {
  try {
    // 1. Parse request body
    const body = await c.req.json<{ message?: string; org_id?: string }>();
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return c.json({ error: 'Missing "message" field' }, 400);
    }

    // 2. Get user context from auth middleware
    // For regular users, org_id comes from their app_users record.
    // For Levelset Admins (super-admins), org_id may be null — fall back to request body.
    const user = c.get('user') as UserContext;
    const orgId = user.orgId || body.org_id;
    const userId = user.appUserId;

    if (!orgId) {
      return c.json({ error: 'No organization context available' }, 400);
    }

    // Levelset Admin usage is billed to 'levelset-internal', not the customer org
    const billingOrgId = isLevelsetAdmin(user.role) ? 'levelset-internal' : orgId;

    // 3. Rate limit check (scoped to billing org, not context org)
    const allowed = await checkRateLimit(billingOrgId);
    if (!allowed) {
      return c.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        429
      );
    }

    // 4. Get or create conversation
    const conversationId = await getOrCreateConversation(userId, orgId);

    // 5. Persist user message
    await persistMessage(conversationId, {
      role: 'user',
      content: userMessage,
    });

    // 6. Load conversation history (last 20 messages)
    const history = await loadConversationHistory(conversationId);

    // 7. Build LLM message array
    const responseConfig = getResponseConfig('user_chat');
    const systemPrompt = buildSystemPrompt({
      userName: user.name,
      style: responseConfig.style,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // 8. Call LLM with tools + tool call loop
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalModel = '';
    let escalated = false;
    let totalLatencyMs = 0;
    let toolCallCount = 0;
    let assistantContent: string | null = null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const llmResponse = await callWithEscalation({
        messages,
        tools: TOOL_DEFINITIONS,
        maxTokens: responseConfig.maxTokens,
        taskType: 'user_chat',
      });

      totalInputTokens += llmResponse.usage.inputTokens;
      totalOutputTokens += llmResponse.usage.outputTokens;
      finalModel = llmResponse.model;
      escalated = escalated || llmResponse.escalated;
      totalLatencyMs += llmResponse.latencyMs;

      // If no tool calls, we have the final response
      if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
        assistantContent = llmResponse.content;
        break;
      }

      // Process tool calls
      toolCallCount += llmResponse.toolCalls.length;

      // Append assistant message with tool_calls to context
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: llmResponse.content,
        tool_calls: llmResponse.toolCalls,
      };
      messages.push(assistantMsg);

      // Persist the assistant's tool-calling message
      await persistMessage(conversationId, {
        role: 'assistant',
        content: llmResponse.content ?? '',
        toolCalls: llmResponse.toolCalls,
      });

      // Execute each tool and append results
      for (const toolCall of llmResponse.toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        const toolResult = await executeTool(
          toolCall.function.name,
          args,
          orgId
        );

        // Append tool result to messages for next LLM call
        const toolMsg: ChatMessage = {
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
        };
        messages.push(toolMsg);

        // Persist tool result
        await persistMessage(conversationId, {
          role: 'tool',
          content: toolResult,
          toolCallId: toolCall.id,
        });
      }

      // If this is the last iteration and we still have tool calls,
      // force a final call without tools to get a text response
      if (iteration === MAX_TOOL_ITERATIONS - 1) {
        const finalResponse = await callWithEscalation({
          messages,
          maxTokens: responseConfig.maxTokens,
          taskType: 'user_chat',
        });
        totalInputTokens += finalResponse.usage.inputTokens;
        totalOutputTokens += finalResponse.usage.outputTokens;
        totalLatencyMs += finalResponse.latencyMs;
        assistantContent = finalResponse.content;
      }
    }

    // Default fallback content
    if (!assistantContent) {
      assistantContent = "I wasn't able to generate a response. Please try again.";
    }

    // 9. Persist final assistant message
    await persistMessage(conversationId, {
      role: 'assistant',
      content: assistantContent,
      metadata: {
        model: finalModel,
        escalated,
        tool_call_count: toolCallCount,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    });

    // 10. Log usage (non-blocking — fire and forget)
    // billingOrgId ensures Levelset Admin usage is billed internally
    logUsage({
      orgId: billingOrgId,
      userId,
      conversationId,
      model: finalModel,
      tier: escalated ? 'escalation' : 'primary',
      taskType: 'user_chat',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: totalLatencyMs,
      escalated,
    }).catch((err) => {
      console.error('Usage logging failed:', err);
    });

    // 11. Return response matching mobile contract
    return c.json({ message: assistantContent });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return c.json(
      { message: "I'm having trouble right now. Please try again." },
      500
    );
  }
});
