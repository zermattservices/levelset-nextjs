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
import { callWithEscalation, streamOpenRouter } from '../../lib/llm-clients/openrouter.js';
import { getResponseConfig, routeToModel } from '../../lib/llm-router.js';
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
    const body = await c.req.json<{ message?: string; org_id?: string; stream?: boolean }>();
    const wantsStream = body.stream === true;
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

    // Levelset Admin usage is billed to their own org (Levelset), not the customer org
    // user.orgId is the admin's own org; orgId may be the customer org from the request body
    const billingOrgId = isLevelsetAdmin(user.role) && user.orgId ? user.orgId : orgId;

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
    if (!assistantContent && !wantsStream) {
      assistantContent = "I wasn't able to generate a response. Please try again.";
    }

    // 9. Streaming response path
    if (wantsStream && !assistantContent) {
      // Stream the final response via SSE
      const model = routeToModel('user_chat', false);
      const stream = await streamOpenRouter({
        model,
        messages,
        maxTokens: responseConfig.maxTokens,
      });

      let fullContent = '';

      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const reader = stream.getReader();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullContent += value;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: value })}\n\n`)
                );
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
              );
              controller.close();
            } catch (err) {
              controller.error(err);
            }

            // Persist and log after stream completes (non-blocking)
            persistMessage(conversationId, {
              role: 'assistant',
              content: fullContent,
              metadata: { model, escalated, tool_call_count: toolCallCount },
            }).catch(() => {});

            logUsage({
              orgId: billingOrgId,
              userId,
              conversationId,
              model,
              tier: 'primary',
              taskType: 'user_chat',
              inputTokens: totalInputTokens,
              outputTokens: 0,
              latencyMs: Date.now() - Date.now(),
              escalated,
            }).catch(() => {});
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Non-streaming fallback
    if (!assistantContent) {
      assistantContent = "I wasn't able to generate a response. Please try again.";
    }

    // 10. Persist final assistant message
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

    // 11. Log usage (non-blocking — fire and forget)
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

    // 12. Return response matching mobile contract
    return c.json({ message: assistantContent });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return c.json(
      { message: "I'm having trouble right now. Please try again." },
      500
    );
  }
});
