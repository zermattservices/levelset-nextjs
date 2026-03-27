/**
 * Chat endpoint — Levi AI conversations.
 *
 * Architecture: Single Sonnet 4.6 agent with native tool calling and
 * adaptive thinking. Escalation fallback to Opus 4.6 via code-level try/catch.
 *
 * Built on the Vercel AI SDK:
 *   - streamText() with tool definitions + stepCountIs for the tool loop
 *   - generateText() for the non-streaming path
 *   - createUIMessageStream for SSE streaming
 *   - smoothStream for word-by-word effect
 *   - onStepFinish for tool-status labels and display tool UI blocks
 *
 * Custom data parts:
 *   data-tool-status — human-readable labels for tool call progress
 *   data-ui-block — display tool visual cards (employee list, employee card)
 */

import { Hono } from 'hono';
import {
  streamText,
  generateText,
  smoothStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
} from 'ai';
import type { ModelMessage } from 'ai';
import type { UserContext, ChatMessage } from '../../lib/types.js';
import { models } from '../../lib/ai-provider.js';
import { buildSystemPrompt } from '../../lib/prompts.js';
import { loadOrgContext } from '../../lib/org-context.js';
import {
  getOrCreateConversation,
  loadConversationHistory,
  persistMessage,
  findActiveConversation,
  loadHistoryPage,
  archiveConversation,
} from '../../lib/conversation-manager.js';
import { retrieveContext } from '../../lib/context-retriever.js';
import { logUsage, checkRateLimit } from '../../lib/usage-tracker.js';

import { buildTools, getToolCallLabel } from '../../lib/tool-registry.js';
import type { ToolRegistryContext } from '../../lib/tool-registry.js';

const MAX_TOOL_STEPS = 5;
const DISPLAY_TOOLS = new Set(['show_employee_list', 'show_employee_card']);

/* ── Location → Org resolver + access validation ─────────── */

import { getServiceClient } from '@levelset/supabase-client';

interface ResolvedContext {
  orgId: string;
  locationId?: string;
}

/**
 * Resolve org_id from location_id (server-side lookup, not client-supplied org_id).
 * Validates the user has access to the requested location via:
 *   1. User's assigned location_id on app_users
 *   2. Explicit entry in user_location_access table
 *
 * Levelset Admins bypass access checks entirely.
 *
 * If no location_id is provided, falls back to user.orgId.
 */
async function resolveOrgContext(
  user: UserContext,
  requestedLocationId?: string
): Promise<ResolvedContext | { error: string; status: number }> {
  // No location specified — use user's default org
  if (!requestedLocationId) {
    return { orgId: user.orgId };
  }

  const supabase = getServiceClient();

  // Look up the location to get its org_id (single source of truth)
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('id, org_id')
    .eq('id', requestedLocationId)
    .maybeSingle();

  if (locError || !location) {
    return { error: 'Location not found', status: 404 };
  }

  // Admins bypass location access checks
  if (user.isAdmin) {
    return { orgId: location.org_id, locationId: requestedLocationId };
  }

  // Check 1: Is this the user's assigned location?
  // (app_users.location_id — checked via a quick query since user context
  // doesn't include it and we need the app_user for this org specifically)
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, location_id')
    .eq('id', user.appUserId)
    .maybeSingle();

  if (appUser?.location_id === requestedLocationId) {
    return { orgId: location.org_id, locationId: requestedLocationId };
  }

  // Check 2: Does the user have explicit access via user_location_access?
  if (appUser) {
    const { data: access } = await supabase
      .from('user_location_access')
      .select('id')
      .eq('user_id', appUser.id)
      .eq('location_id', requestedLocationId)
      .maybeSingle();

    if (access) {
      return { orgId: location.org_id, locationId: requestedLocationId };
    }
  }

  return { error: 'You do not have access to this location', status: 403 };
}

/* ── Convert DB ChatMessages to AI SDK ModelMessages ──────── */

function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  // Collect all tool_call IDs from assistant messages so we can validate
  // that every tool result has a matching tool_call in the history.
  const toolCallIds = new Set<string>();
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        toolCallIds.add(tc.id);
      }
    }
  }

  // Drop leading tool messages (can happen when the 20-message limit cuts
  // off mid-sequence, leaving orphaned tool results at the start).
  let startIdx = 0;
  while (startIdx < messages.length && messages[startIdx].role === 'tool') {
    startIdx++;
  }

  const result: ModelMessage[] = [];

  for (let i = startIdx; i < messages.length; i++) {
    const msg = messages[i];
    switch (msg.role) {
      case 'system':
        result.push({ role: 'system', content: msg.content ?? '' });
        break;

      case 'user':
        result.push({ role: 'user', content: msg.content ?? '' });
        break;

      case 'assistant': {
        // Assistant messages may include tool_calls in the DB format.
        // For the AI SDK, we need to convert them to ToolCallPart content parts.
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          const parts: Array<
            | { type: 'text'; text: string }
            | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
          > = [];
          if (msg.content) {
            parts.push({ type: 'text', text: msg.content });
          }
          for (const tc of msg.tool_calls) {
            parts.push({
              type: 'tool-call',
              toolCallId: tc.id,
              toolName: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            });
          }
          result.push({ role: 'assistant', content: parts as any });
        } else {
          result.push({ role: 'assistant', content: msg.content ?? '' });
        }
        break;
      }

      case 'tool': {
        // Only include tool results that have a matching tool_call in history.
        // Orphaned tool results (from truncated history) cause Anthropic API errors:
        // "unexpected tool_use_id found in tool_result blocks"
        if (msg.tool_call_id && toolCallIds.has(msg.tool_call_id)) {
          result.push({
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: msg.tool_call_id,
                toolName: '',
                output: { type: 'text' as const, value: msg.content ?? '' },
              },
            ],
          });
        }
        break;
      }
    }
  }

  return result;
}

export const chatRoute = new Hono();

/**
 * GET /history — paginated chat history for the mobile app.
 */
chatRoute.get('/history', async (c) => {
  try {
    const user = c.get('user') as UserContext;
    const resolved = await resolveOrgContext(user, c.req.query('location_id') ?? undefined);
    if ('error' in resolved) return c.json({ messages: [], hasMore: false });
    const { orgId, locationId } = resolved;

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

/**
 * DELETE /clear — Archive the active conversation (soft delete).
 * Clears chat context so the next message starts a fresh conversation.
 */
chatRoute.delete('/clear', async (c) => {
  try {
    const user = c.get('user') as UserContext;
    const resolved = await resolveOrgContext(user, c.req.query('location_id') ?? undefined);
    if ('error' in resolved) {
      return c.json({ success: false, error: resolved.error }, resolved.status as any);
    }
    const { orgId, locationId } = resolved;

    const archived = await archiveConversation(user.appUserId, orgId, locationId);
    return c.json({ success: true, archived });
  } catch (err) {
    console.error('Clear conversation error:', err);
    return c.json({ success: false, error: 'Failed to clear conversation' }, 500);
  }
});

/**
 * POST / — Main chat endpoint with AI SDK streaming.
 *
 * Single Sonnet 4.6 agent with native tool calling and adaptive thinking.
 * Escalation fallback to Opus 4.6 on primary model failure.
 */
chatRoute.post('/', async (c) => {
  try {
    // 1. Parse request body
    const body = await c.req.json<{
      message?: string;
      location_id?: string;
      stream?: boolean;
    }>();
    const wantsStream = body.stream !== false; // Default to streaming
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return c.json({ error: 'Missing "message" field' }, 400);
    }

    // 2. Get user context from auth middleware + resolve org from location
    const user = c.get('user') as UserContext;
    const resolved = await resolveOrgContext(user, body.location_id);
    if ('error' in resolved) {
      return c.json({ error: resolved.error }, resolved.status as any);
    }
    const { orgId, locationId } = resolved;
    const userId = user.appUserId;

    const billingOrgId = user.isAdmin && user.orgId ? user.orgId : orgId;

    // 3. Rate limit check
    const allowed = await checkRateLimit(billingOrgId);
    if (!allowed) {
      return c.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        429
      );
    }

    // 4. Get or create conversation + load org context + retrieve context in parallel
    const [conversationId, orgContext, contextResult] = await Promise.all([
      getOrCreateConversation(userId, orgId, locationId),
      loadOrgContext(orgId, locationId).catch((err) => {
        console.warn('Org context load failed (non-fatal):', err);
        return undefined;
      }),
      retrieveContext(userMessage, orgId, locationId).catch((err) => {
        console.warn('Context retrieval failed (non-fatal):', err);
        return undefined;
      }),
    ]);

    // 5. Persist user message
    await persistMessage(conversationId, {
      role: 'user',
      content: userMessage,
    });

    // 6. Load conversation history and convert to AI SDK format
    const history = await loadConversationHistory(conversationId);
    const llmMessages = toModelMessages(history);

    // 7. Build system prompt (with org context + retrieved context)
    const retrievedParts = [
      ...(contextResult?.semanticChunks || []),
      contextResult?.documentContext,
    ].filter(Boolean);

    const systemPrompt = buildSystemPrompt({
      userName: user.name,
      style: 'concise',
      orgContext,
      coreContext: contextResult?.coreContext || undefined,
      retrievedContext: retrievedParts.length > 0 ? retrievedParts.join('\n\n') : undefined,
    });

    // 8. Build tool registry context
    const registryCtx: ToolRegistryContext = {
      orgId,
      locationId,
      features: orgContext?.features,
      isAdmin: user.isAdmin,
      employeeId: user.employeeId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: user.permissions,
      accessibleLocationIds: user.accessibleLocationIds,
    };

    // 9. Streaming path (default)
    if (wantsStream) {
      const startMs = Date.now();

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          let finalModel = '';
          let escalated = false;
          let toolCallCount = 0;
          let assistantContent = '';
          const allUIBlocks: Array<{ blockType: string; blockId: string; payload: Record<string, unknown> }> = [];

          const leviTools = buildTools(registryCtx);

          const runAgent = (model: ReturnType<typeof models.languageModel>) => {
            return streamText({
              model,
              system: systemPrompt,
              messages: llmMessages,
              tools: leviTools,
              stopWhen: stepCountIs(MAX_TOOL_STEPS),
              providerOptions: {
                openrouter: {
                  reasoning: { enabled: true },
                  verbosity: 'medium',
                },
              },
              experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' }),
              onStepFinish: async (step) => {
                // Track usage
                if (step.usage) {
                  totalInputTokens += step.usage.inputTokens ?? 0;
                  totalOutputTokens += step.usage.outputTokens ?? 0;
                }

                // Emit tool-status SSE labels for data tools
                if (step.toolCalls && step.toolCalls.length > 0) {
                  toolCallCount += step.toolCalls.length;
                  for (const tc of step.toolCalls as Array<{ toolCallId: string; toolName: string; input: Record<string, unknown> }>) {
                    if (!DISPLAY_TOOLS.has(tc.toolName)) {
                      writer.write({
                        type: 'data-tool-status' as any,
                        data: {
                          toolCallId: tc.toolCallId,
                          toolName: tc.toolName,
                          status: 'done',
                          label: getToolCallLabel(tc.toolName, tc.input),
                        },
                      });
                    }
                  }
                }

                // Persist tool messages and emit UI blocks for display tools
                if (step.toolCalls && step.toolCalls.length > 0) {
                  const dataToolCalls = step.toolCalls
                    .filter((tc: any) => !DISPLAY_TOOLS.has(tc.toolName))
                    .map((tc: any) => ({
                      id: tc.toolCallId,
                      type: 'function' as const,
                      function: { name: tc.toolName, arguments: JSON.stringify(tc.input) },
                    }));

                  if (dataToolCalls.length > 0) {
                    await persistMessage(conversationId, {
                      role: 'assistant',
                      content: step.text || '',
                      toolCalls: dataToolCalls,
                    });
                  }

                  if (step.toolResults) {
                    for (const tr of step.toolResults as Array<{ toolCallId: string; output: unknown }>) {
                      const output = tr.output;
                      const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
                      const isDisplay = typeof output === 'object' && output !== null && (output as any).__display;

                      if (isDisplay) {
                        const block = {
                          blockType: (output as any).blockType as string,
                          blockId: (output as any).blockId as string,
                          payload: (output as any).payload as Record<string, unknown>,
                        };
                        allUIBlocks.push(block);
                        writer.write({ type: 'data-ui-block' as any, data: block });
                      } else {
                        await persistMessage(conversationId, {
                          role: 'tool',
                          content: outputStr,
                          toolCallId: tr.toolCallId,
                        });
                      }
                    }
                  }
                }
              },
            });
          };

          try {
            const result = runAgent(models.languageModel('primary'));
            writer.merge(result.toUIMessageStream({
              sendStart: false,
              onError: (error) => {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error('[Chat] Primary stream error:', { error: errMsg });
                return "I'm having trouble right now. Please try again.";
              },
            }));
            assistantContent = await result.text;
            const response = await result.response;
            finalModel = response?.modelId || 'anthropic/claude-sonnet-4-6';
            if (totalInputTokens === 0) {
              const usage = await result.usage;
              totalInputTokens = usage?.inputTokens ?? 0;
              totalOutputTokens = usage?.outputTokens ?? 0;
            }
          } catch (primaryError) {
            console.warn('Primary model failed, escalating to Opus:', primaryError);
            escalated = true;
            totalInputTokens = 0;
            totalOutputTokens = 0;
            toolCallCount = 0;

            try {
              const fallbackResult = runAgent(models.languageModel('escalation'));
              writer.merge(fallbackResult.toUIMessageStream({
                sendStart: false,
                onError: (error) => {
                  const errMsg = error instanceof Error ? error.message : String(error);
                  console.error('[Chat] Escalation stream error:', { error: errMsg });
                  return "I'm having trouble right now. Please try again.";
                },
              }));
              assistantContent = await fallbackResult.text;
              const fallbackResponse = await fallbackResult.response;
              finalModel = fallbackResponse?.modelId || 'anthropic/claude-opus-4-6';
              const fallbackUsage = await fallbackResult.usage;
              totalInputTokens = fallbackUsage?.inputTokens ?? 0;
              totalOutputTokens = fallbackUsage?.outputTokens ?? 0;
            } catch (escalationError) {
              console.error('Escalation model also failed:', escalationError);
              assistantContent = "I'm having trouble right now. Please try again.";
            }
          }

          // Persist final assistant message
          if (assistantContent) {
            persistMessage(conversationId, {
              role: 'assistant',
              content: assistantContent,
              metadata: { model: finalModel, escalated, tool_call_count: toolCallCount, input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
              uiBlocks: allUIBlocks.length > 0 ? allUIBlocks : undefined,
            }).catch(() => {});
          }

          // Log usage
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
            toolCount: toolCallCount > 0 ? toolCallCount : undefined,
          }).catch(() => {});
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    // ── Non-streaming path ────────────────────────────────────
    const startMs = Date.now();
    let assistantContent = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalModel = '';
    let escalated = false;

    const leviTools = buildTools(registryCtx);

    try {
      const result = await generateText({
        model: models.languageModel('primary'),
        system: systemPrompt,
        messages: llmMessages,
        tools: leviTools,
        stopWhen: stepCountIs(MAX_TOOL_STEPS),
        providerOptions: {
          openrouter: {
            reasoning: { enabled: true },
            verbosity: 'medium',
          },
        },
      });
      assistantContent = result.text;
      finalModel = result.response?.modelId || 'anthropic/claude-sonnet-4-6';
      totalInputTokens = result.usage?.inputTokens ?? 0;
      totalOutputTokens = result.usage?.outputTokens ?? 0;
    } catch (primaryError) {
      console.warn('Primary model failed, escalating:', primaryError);
      escalated = true;
      const result = await generateText({
        model: models.languageModel('escalation'),
        system: systemPrompt,
        messages: llmMessages,
        tools: leviTools,
        stopWhen: stepCountIs(MAX_TOOL_STEPS),
        providerOptions: {
          openrouter: {
            reasoning: { enabled: true },
            verbosity: 'medium',
          },
        },
      });
      assistantContent = result.text;
      finalModel = result.response?.modelId || 'anthropic/claude-opus-4-6';
      totalInputTokens = result.usage?.inputTokens ?? 0;
      totalOutputTokens = result.usage?.outputTokens ?? 0;
    }

    if (!assistantContent) {
      assistantContent = "I wasn't able to generate a response. Please try again.";
    }

    await persistMessage(conversationId, {
      role: 'assistant',
      content: assistantContent,
      metadata: { model: finalModel, escalated, input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    });

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
    }).catch((err) => console.error('Usage logging failed:', err));

    return c.json({ message: assistantContent });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return c.json(
      { message: "I'm having trouble right now. Please try again." },
      500
    );
  }
});
