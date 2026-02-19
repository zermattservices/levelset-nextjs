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
 *
 * Streaming (stream: true):
 *   Returns SSE with structured events: tool_call, tool_result, delta, done
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
  findActiveConversation,
  loadHistoryPage,
} from '../../lib/conversation-manager.js';
import { logUsage, checkRateLimit } from '../../lib/usage-tracker.js';
import { TOOL_DEFINITIONS, executeTool } from '../../tools/index.js';

const MAX_TOOL_ITERATIONS = 5;

/* ── SSE helpers ─────────────────────────────────────────────── */

function emitSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: Record<string, unknown>,
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

/** Split text into chunks at word boundaries, roughly `size` chars each */
function chunkText(text: string, size = 12): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= size) {
      chunks.push(remaining);
      break;
    }
    // Find the last space at or before `size`
    let end = remaining.lastIndexOf(' ', size);
    if (end <= 0) end = size; // no space found, hard-cut
    chunks.push(remaining.slice(0, end + 1));
    remaining = remaining.slice(end + 1);
  }
  return chunks;
}

/** Human-readable label for a tool call (shown in UI) */
function getToolCallLabel(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'lookup_employee': {
      const q = args.query || args.name || '';
      return q ? `Looking up ${q}` : 'Looking up employee';
    }
    case 'list_employees':
      return 'Listing employees';
    case 'get_employee_ratings': {
      const empName = args.employee_name || '';
      return empName ? `Checking ratings for ${empName}` : 'Checking employee ratings';
    }
    case 'get_employee_infractions': {
      const empName = args.employee_name || '';
      return empName ? `Checking infractions for ${empName}` : 'Checking employee infractions';
    }
    default:
      return `Running ${name.replace(/_/g, ' ')}`;
  }
}

/** Human-readable label for a tool result */
function getToolResultLabel(name: string, result: string): string {
  try {
    const parsed = JSON.parse(result);
    if (parsed.error) return `Error: ${parsed.error}`;
    if (parsed.message) return parsed.message; // "No active employee found matching ..."
    if (Array.isArray(parsed)) return `Found ${parsed.length} result${parsed.length === 1 ? '' : 's'}`;
    if (parsed.employees && Array.isArray(parsed.employees))
      return `Found ${parsed.employees.length} employee${parsed.employees.length === 1 ? '' : 's'}`;
    if (parsed.ratings && Array.isArray(parsed.ratings))
      return `Found ${parsed.ratings.length} rating${parsed.ratings.length === 1 ? '' : 's'}`;
    if (parsed.infractions && Array.isArray(parsed.infractions))
      return `Found ${parsed.infractions.length} infraction${parsed.infractions.length === 1 ? '' : 's'}`;
    if (parsed.full_name || parsed.first_name) return `Found ${parsed.full_name || parsed.first_name}`;
    return 'Done';
  } catch {
    return 'Done';
  }
}

export const chatRoute = new Hono();

/**
 * GET /history — paginated chat history for the mobile app.
 *
 * Query params:
 *   org_id  — org context (required if user has no org_id)
 *   before  — ISO timestamp cursor; returns messages before this time
 *   limit   — page size (default 10, max 50)
 *
 * Returns { messages, hasMore }.
 * Read-only — does NOT create a conversation if none exists.
 */
chatRoute.get('/history', async (c) => {
  try {
    const user = c.get('user') as UserContext;
    const isAdmin = isLevelsetAdmin(user.role);
    // Admins pass customer org_id as query param; regular users use their own
    const orgId = isAdmin
      ? (c.req.query('org_id') || user.orgId)
      : (user.orgId || c.req.query('org_id'));
    if (!orgId) return c.json({ messages: [], hasMore: false });
    const locationId = c.req.query('location_id') ?? undefined;

    // Read-only: find existing conversation, don't create one
    const conversationId = await findActiveConversation(user.appUserId, orgId, locationId);
    if (!conversationId) return c.json({ messages: [], hasMore: false });

    const before = c.req.query('before') ?? undefined;
    const limitParam = parseInt(c.req.query('limit') ?? '10', 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);

    const result = await loadHistoryPage(conversationId, { limit, before });

    return c.json(result);
  } catch (err) {
    console.error('History endpoint error:', err);
    return c.json({ messages: [], hasMore: false });
  }
});

chatRoute.post('/', async (c) => {
  try {
    // 1. Parse request body
    const body = await c.req.json<{ message?: string; org_id?: string; location_id?: string; stream?: boolean }>();
    const wantsStream = body.stream === true;
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return c.json({ error: 'Missing "message" field' }, 400);
    }

    // 2. Get user context from auth middleware
    // For Levelset Admins: prefer body.org_id (the customer org they're browsing)
    //   over user.orgId (Levelset HQ org) so tool queries return customer data.
    // For regular users: org_id comes from their app_users record.
    const user = c.get('user') as UserContext;
    const isAdmin = isLevelsetAdmin(user.role);
    const orgId = isAdmin
      ? (body.org_id || user.orgId)   // Admin: prefer customer org from request
      : (user.orgId || body.org_id);  // Regular: prefer user's own org
    const locationId = body.location_id;
    const userId = user.appUserId;

    if (!orgId) {
      return c.json({ error: 'No organization context available' }, 400);
    }

    // Levelset Admin usage is billed to their own org (Levelset), not the customer org
    const billingOrgId = isAdmin && user.orgId ? user.orgId : orgId;

    // 3. Rate limit check (scoped to billing org, not context org)
    const allowed = await checkRateLimit(billingOrgId);
    if (!allowed) {
      return c.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        429
      );
    }

    // 4. Get or create conversation (scoped to user+org+location)
    const conversationId = await getOrCreateConversation(userId, orgId, locationId);

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

    // 8. Streaming vs non-streaming path
    if (wantsStream) {
      // ── SSE streaming path ──────────────────────────────────
      // Create the SSE response immediately so the client gets
      // tool_call / tool_result / delta / done events in real time.
      const startMs = Date.now();

      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            let finalModel = '';
            let escalated = false;
            let totalLatencyMs = 0;
            let toolCallCount = 0;
            let assistantContent: string | null = null;

            try {
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

                // No tool calls → final response
                if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
                  assistantContent = llmResponse.content;
                  break;
                }

                toolCallCount += llmResponse.toolCalls.length;

                // Append assistant message with tool_calls to context
                const assistantMsg: ChatMessage = {
                  role: 'assistant',
                  content: llmResponse.content,
                  tool_calls: llmResponse.toolCalls,
                };
                messages.push(assistantMsg);

                await persistMessage(conversationId, {
                  role: 'assistant',
                  content: llmResponse.content ?? '',
                  toolCalls: llmResponse.toolCalls,
                });

                // Execute each tool — emit SSE events before/after
                for (const toolCall of llmResponse.toolCalls) {
                  let args: Record<string, unknown> = {};
                  try {
                    args = JSON.parse(toolCall.function.arguments);
                  } catch {
                    args = {};
                  }

                  // Emit tool_call event → client shows spinner
                  emitSSE(controller, encoder, {
                    event: 'tool_call',
                    id: toolCall.id,
                    name: toolCall.function.name,
                    label: getToolCallLabel(toolCall.function.name, args),
                  });

                  const toolResult = await executeTool(
                    toolCall.function.name,
                    args,
                    orgId,
                  );

                  // Emit tool_result event → client shows checkmark
                  emitSSE(controller, encoder, {
                    event: 'tool_result',
                    id: toolCall.id,
                    name: toolCall.function.name,
                    label: getToolResultLabel(toolCall.function.name, toolResult),
                  });

                  const toolMsg: ChatMessage = {
                    role: 'tool',
                    content: toolResult,
                    tool_call_id: toolCall.id,
                  };
                  messages.push(toolMsg);

                  await persistMessage(conversationId, {
                    role: 'tool',
                    content: toolResult,
                    toolCallId: toolCall.id,
                  });
                }

                // Last iteration safety — force a text response
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

              // Fallback
              if (!assistantContent) {
                assistantContent = "I wasn't able to generate a response. Please try again.";
              }

              // Emit content as delta chunks with small delays for streaming effect
              const chunks = chunkText(assistantContent, 12);
              for (const chunk of chunks) {
                emitSSE(controller, encoder, { event: 'delta', text: chunk });
                // Small delay so the client receives chunks incrementally
                await new Promise((r) => setTimeout(r, 15));
              }

              // Done
              emitSSE(controller, encoder, { event: 'done' });
              controller.close();

              // Persist + log (non-blocking, after stream closes)
              persistMessage(conversationId, {
                role: 'assistant',
                content: assistantContent,
                metadata: {
                  model: finalModel,
                  escalated,
                  tool_call_count: toolCallCount,
                  input_tokens: totalInputTokens,
                  output_tokens: totalOutputTokens,
                },
              }).catch(() => {});

              logUsage({
                orgId: billingOrgId,
                userId,
                conversationId,
                model: finalModel,
                tier: escalated ? 'escalation' : 'primary',
                taskType: 'user_chat',
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                latencyMs: Date.now() - startMs,
                escalated,
              }).catch(() => {});
            } catch (err) {
              console.error('Streaming error:', err);
              emitSSE(controller, encoder, {
                event: 'error',
                message: "I'm having trouble right now. Please try again.",
              });
              controller.close();
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        },
      );
    }

    // ── Non-streaming path (unchanged) ──────────────────────
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

      if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
        assistantContent = llmResponse.content;
        break;
      }

      toolCallCount += llmResponse.toolCalls.length;

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: llmResponse.content,
        tool_calls: llmResponse.toolCalls,
      };
      messages.push(assistantMsg);

      await persistMessage(conversationId, {
        role: 'assistant',
        content: llmResponse.content ?? '',
        toolCalls: llmResponse.toolCalls,
      });

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
          orgId,
        );

        const toolMsg: ChatMessage = {
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
        };
        messages.push(toolMsg);

        await persistMessage(conversationId, {
          role: 'tool',
          content: toolResult,
          toolCallId: toolCall.id,
        });
      }

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
