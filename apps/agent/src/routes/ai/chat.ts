/**
 * Chat endpoint — main orchestrator for Levi AI conversations.
 *
 * Built on the Vercel AI SDK:
 *   - streamText() for LLM calls with automatic multi-step tool execution
 *   - createUIMessageStream for structured SSE streaming
 *   - smoothStream for word-by-word streaming effect
 *   - tool() + Zod for type-safe tool definitions
 *
 * Streaming events follow the AI SDK UI Message Stream Protocol:
 *   start, text-start, text-delta, text-end, tool-call, tool-result, finish
 *
 * Custom data parts:
 *   data-tool-status — human-readable labels for tool call progress
 */

import { Hono } from 'hono';
import {
  streamText,
  generateText,
  tool,
  smoothStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
} from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { isLevelsetAdmin } from '@levelset/permissions';
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
} from '../../lib/conversation-manager.js';
import { logUsage, checkRateLimit } from '../../lib/usage-tracker.js';
import {
  lookupEmployee,
  listEmployees,
} from '../../tools/data/employee.js';
import { getEmployeeRatings } from '../../tools/data/ratings.js';
import { getEmployeeInfractions } from '../../tools/data/infractions.js';
import { getEmployeeProfile } from '../../tools/data/profile.js';
import { getTeamOverview } from '../../tools/data/team.js';
import { getDisciplineSummary } from '../../tools/data/discipline.js';

const MAX_TOOL_STEPS = 3;

/* ── Convert DB ChatMessages to AI SDK ModelMessages ──────── */

function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  const result: ModelMessage[] = [];

  for (const msg of messages) {
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
        // Tool result messages — each has a tool_call_id linking back to the tool call.
        result.push({
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: msg.tool_call_id ?? '',
              toolName: '',
              output: { type: 'text' as const, value: msg.content ?? '' },
            },
          ],
        });
        break;
      }
    }
  }

  return result;
}

/* ── Human-readable tool labels ─────────────────────────────── */

function getToolCallLabel(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'lookup_employee': {
      const q = input.name || input.query || '';
      return q ? `Looking up ${q}` : 'Looking up employee';
    }
    case 'list_employees':
      return 'Listing employees';
    case 'get_employee_ratings': {
      const empName = input.employee_name || '';
      return empName ? `Checking ratings for ${empName}` : 'Checking employee ratings';
    }
    case 'get_employee_infractions': {
      const empName = input.employee_name || '';
      return empName ? `Checking infractions for ${empName}` : 'Checking employee infractions';
    }
    case 'get_employee_profile':
      return 'Loading employee profile';
    case 'get_team_overview':
      return 'Loading team overview';
    case 'get_discipline_summary':
      return input.employee_id ? 'Loading discipline details' : 'Loading discipline overview';
    default:
      return `Running ${name.replace(/_/g, ' ')}`;
  }
}

/* ── Build tool definitions ─────────────────────────────────── */

function buildTools(orgId: string, locationId?: string) {
  return {
    lookup_employee: tool({
      description:
        'Search for an employee by name and return their details including role, hire date, certification status, and current discipline points.',
      inputSchema: z.object({
        name: z.string().describe('Full or partial name of the employee to search for'),
        role: z.string().optional().describe('Filter by role name (e.g. "Team Leader")'),
      }),
      execute: async ({ name, role }: { name: string; role?: string }) => {
        return await lookupEmployee({ name, role }, orgId, locationId);
      },
    }),
    list_employees: tool({
      description:
        'List employees in the organization. Can filter by active status, position type (FOH/BOH), leaders, trainers, or role.',
      inputSchema: z.object({
        active_only: z.boolean().optional().describe('Only return active employees (default: true)'),
        is_leader: z.boolean().optional().describe('Filter for leaders only'),
        is_boh: z.boolean().optional().describe('Filter for back-of-house employees'),
        is_foh: z.boolean().optional().describe('Filter for front-of-house employees'),
        is_trainer: z.boolean().optional().describe('Filter for trainers only'),
        role: z.string().optional().describe('Filter by role name'),
        limit: z.number().optional().describe('Maximum number of employees to return (default: 20, max: 50)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await listEmployees(input, orgId, locationId);
      },
    }),
    get_employee_ratings: tool({
      description:
        'Get rating history for a specific employee. Returns their ratings (rating_1 through rating_5, rating_avg) with dates and positions rated. Use lookup_employee first to get the employee ID. Prefer get_employee_profile instead if you also need discipline data.',
      inputSchema: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
        limit: z.number().optional().describe('Maximum number of ratings to return (default: 10)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getEmployeeRatings(input, orgId, locationId);
      },
    }),
    get_employee_infractions: tool({
      description:
        'Get infraction and discipline history for a specific employee. Returns infraction type, points, date, leader who documented, and notes. Use lookup_employee first to get the employee ID.',
      inputSchema: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
        limit: z.number().optional().describe('Maximum number of infractions to return (default: 10)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getEmployeeInfractions(input, orgId, locationId);
      },
    }),
    get_employee_profile: tool({
      description:
        'Get a comprehensive one-shot profile for an employee including their details, recent ratings with trends, infractions with active points, and discipline actions. More efficient than calling individual tools separately. Use lookup_employee first to get the employee ID.',
      inputSchema: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getEmployeeProfile(input, orgId, locationId);
      },
    }),
    get_team_overview: tool({
      description:
        'Get a location-level team snapshot including role breakdown, FOH/BOH zone split, certification stats, leadership counts, employees needing attention (high points), and recent hires. Great for "how is the team doing?" questions.',
      inputSchema: z.object({
        zone: z
          .enum(['FOH', 'BOH'])
          .optional()
          .describe('Filter to front-of-house or back-of-house employees only'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getTeamOverview(input, orgId, locationId);
      },
    }),
    get_discipline_summary: tool({
      description:
        'Get a discipline overview. When employee_id is provided, returns detailed discipline history for that person including infractions, actions taken, and pending recommendations. When omitted, returns a location-wide discipline overview with point holders, infraction breakdown, and recent actions.',
      inputSchema: z.object({
        employee_id: z
          .string()
          .optional()
          .describe('Optional UUID of a specific employee. Omit for location-wide overview.'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getDisciplineSummary(input, orgId, locationId);
      },
    }),
  };
}

export const chatRoute = new Hono();

/**
 * GET /history — paginated chat history for the mobile app.
 */
chatRoute.get('/history', async (c) => {
  try {
    const user = c.get('user') as UserContext;
    const isAdmin = isLevelsetAdmin(user.role);
    const orgId = isAdmin
      ? (c.req.query('org_id') || user.orgId)
      : (user.orgId || c.req.query('org_id'));
    if (!orgId) return c.json({ messages: [], hasMore: false });
    const locationId = c.req.query('location_id') ?? undefined;

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
 * POST / — Main chat endpoint with AI SDK streaming.
 */
chatRoute.post('/', async (c) => {
  try {
    // 1. Parse request body
    const body = await c.req.json<{
      message?: string;
      org_id?: string;
      location_id?: string;
      stream?: boolean;
    }>();
    const wantsStream = body.stream !== false; // Default to streaming
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return c.json({ error: 'Missing "message" field' }, 400);
    }

    // 2. Get user context from auth middleware
    const user = c.get('user') as UserContext;
    const isAdmin = isLevelsetAdmin(user.role);
    const orgId = isAdmin
      ? (body.org_id || user.orgId)
      : (user.orgId || body.org_id);
    const locationId = body.location_id;
    const userId = user.appUserId;

    if (!orgId) {
      return c.json({ error: 'No organization context available' }, 400);
    }

    const billingOrgId = isAdmin && user.orgId ? user.orgId : orgId;

    // 3. Rate limit check
    const allowed = await checkRateLimit(billingOrgId);
    if (!allowed) {
      return c.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        429
      );
    }

    // 4. Get or create conversation + load org context in parallel
    const [conversationId, orgContext] = await Promise.all([
      getOrCreateConversation(userId, orgId, locationId),
      loadOrgContext(orgId, locationId).catch((err) => {
        console.warn('Org context load failed (non-fatal):', err);
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

    // 7. Build system prompt (with org context if loaded)
    const systemPrompt = buildSystemPrompt({
      userName: user.name,
      style: 'concise',
      orgContext,
    });

    // 8. Build tools (location-scoped when available)
    const leviTools = buildTools(orgId, locationId);

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

          try {
            const result = streamText({
              model: models.languageModel('primary'),
              system: systemPrompt,
              messages: llmMessages,
              tools: leviTools,
              stopWhen: stepCountIs(MAX_TOOL_STEPS),
              experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' }),
              onStepFinish: async (step) => {
                // Track usage from each step
                if (step.usage) {
                  totalInputTokens += step.usage.inputTokens ?? 0;
                  totalOutputTokens += step.usage.outputTokens ?? 0;
                }

                // Emit custom tool status labels
                if (step.toolCalls && step.toolCalls.length > 0) {
                  toolCallCount += step.toolCalls.length;

                  for (let i = 0; i < step.toolCalls.length; i++) {
                    const tc = step.toolCalls[i] as { toolCallId: string; toolName: string; input: Record<string, unknown> };

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

                // Persist tool messages from this step
                if (step.toolCalls && step.toolCalls.length > 0) {
                  const toolCalls = step.toolCalls.map((tc: any) => ({
                    id: tc.toolCallId,
                    type: 'function' as const,
                    function: {
                      name: tc.toolName,
                      arguments: JSON.stringify(tc.input),
                    },
                  }));

                  await persistMessage(conversationId, {
                    role: 'assistant',
                    content: step.text || '',
                    toolCalls,
                  });

                  if (step.toolResults) {
                    for (const tr of step.toolResults as Array<{ toolCallId: string; output: unknown }>) {
                      await persistMessage(conversationId, {
                        role: 'tool',
                        content: typeof tr.output === 'string'
                          ? tr.output
                          : JSON.stringify(tr.output),
                        toolCallId: tr.toolCallId,
                      });
                    }
                  }
                }
              },
            });

            // Merge the AI SDK stream into our UI message stream
            writer.merge(result.toUIMessageStream({
              sendStart: false,
              onError: (error) => {
                console.error('Stream error:', error);
                return error instanceof Error ? error.message : String(error);
              },
            }));

            // Wait for the stream to complete to get final data
            // streamText returns StreamTextResult where properties are PromiseLike
            assistantContent = await result.text;
            const response = await result.response;
            finalModel = response?.modelId || 'minimax/minimax-m2.5';

            // Only set usage from final result if onStepFinish didn't fire
            if (totalInputTokens === 0) {
              const usage = await result.usage;
              totalInputTokens = usage?.inputTokens ?? 0;
              totalOutputTokens = usage?.outputTokens ?? 0;
            }
          } catch (primaryError) {
            console.warn('Primary model failed, escalating:', primaryError);
            escalated = true;

            try {
              const escalationResult = streamText({
                model: models.languageModel('escalation'),
                system: systemPrompt,
                messages: llmMessages,
                tools: leviTools,
                stopWhen: stepCountIs(MAX_TOOL_STEPS),
                experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' }),
              });

              writer.merge(escalationResult.toUIMessageStream({
                sendStart: false,
                onError: (error) => {
                  return error instanceof Error ? error.message : String(error);
                },
              }));

              assistantContent = await escalationResult.text;
              const escalationResponse = await escalationResult.response;
              finalModel = escalationResponse?.modelId || 'anthropic/claude-sonnet-4.5';

              const escalationUsage = await escalationResult.usage;
              totalInputTokens = escalationUsage?.inputTokens ?? 0;
              totalOutputTokens = escalationUsage?.outputTokens ?? 0;
            } catch (escalationError) {
              console.error('Escalation model failed:', escalationError);
              assistantContent = "I'm having trouble right now. Please try again.";
            }
          }

          // Persist final assistant message (non-blocking)
          if (assistantContent) {
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
          }

          // Log usage (non-blocking)
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
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    // ── Non-streaming path ──────────────────────────────────
    const startMs = Date.now();
    let assistantContent = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalModel = '';
    let escalated = false;

    try {
      const result = await generateText({
        model: models.languageModel('primary'),
        system: systemPrompt,
        messages: llmMessages,
        tools: leviTools,
        stopWhen: stepCountIs(MAX_TOOL_STEPS),
      });

      assistantContent = result.text;
      finalModel = result.response?.modelId || 'minimax/minimax-m2.5';
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
      });

      assistantContent = result.text;
      finalModel = result.response?.modelId || 'anthropic/claude-sonnet-4.5';
      totalInputTokens = result.usage?.inputTokens ?? 0;
      totalOutputTokens = result.usage?.outputTokens ?? 0;
    }

    if (!assistantContent) {
      assistantContent = "I wasn't able to generate a response. Please try again.";
    }

    // Persist final assistant message
    await persistMessage(conversationId, {
      role: 'assistant',
      content: assistantContent,
      metadata: {
        model: finalModel,
        escalated,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    });

    // Log usage (non-blocking)
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
    }).catch((err) => {
      console.error('Usage logging failed:', err);
    });

    return c.json({ message: assistantContent });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return c.json(
      { message: "I'm having trouble right now. Please try again." },
      500
    );
  }
});
