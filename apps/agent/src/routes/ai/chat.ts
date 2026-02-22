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
import { retrieveContext } from '../../lib/context-retriever.js';
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
import { getPositionRankings } from '../../tools/data/rankings.js';
// UI blocks are now emitted by display tools (show_employee_list, show_employee_card)
// called by the LLM, not auto-generated from data tool results.

const MAX_TOOL_STEPS = 5;

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
    case 'get_position_rankings': {
      const pos = input.position || '';
      return pos ? `Ranking employees for ${pos}` : 'Ranking employees by position';
    }
    case 'show_employee_list':
    case 'show_employee_card':
      return ''; // Display tools — no label needed (handled silently)
    default:
      return `Running ${name.replace(/_/g, ' ')}`;
  }
}

/* ── Build tool definitions ─────────────────────────────────── */

function buildTools(
  orgId: string,
  locationId?: string,
  features?: { certifications: boolean; evaluations: boolean; pip: boolean; customRoles: boolean }
) {
  return {
    lookup_employee: tool({
      description:
        'Search for an employee by name and return their basic details (role, hire date, leader/trainer status). Use this to find an employee ID before calling other tools. For a full profile, call get_employee_profile after this.',
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
        'List employees with optional filters. Use for counting or listing employees by role, zone (FOH/BOH), leaders, or trainers. Does NOT include ratings or discipline data — use get_team_overview for that.',
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
        'Get detailed rating history for ONE specific employee — individual ratings with scores, dates, and positions. Requires employee_id (use lookup_employee first). For team-wide rating data, use get_team_overview instead. Prefer get_employee_profile if you also need discipline data.',
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
        'Get infraction history for ONE specific employee. Requires employee_id (use lookup_employee first). For team-wide discipline data, use get_discipline_summary instead.',
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
        'Get a comprehensive profile for ONE employee: details, recent ratings with trend, infractions, and discipline actions — all in one call. Requires employee_id (use lookup_employee first). After calling this, do NOT also call get_employee_ratings or get_employee_infractions.',
      inputSchema: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getEmployeeProfile(input, orgId, locationId);
      },
    }),
    get_team_overview: tool({
      description:
        'Get the full team overview: rating averages by position, top/bottom performers by rating, team structure (roles, zones, leaders, trainers), discipline attention items, and recent hires. This is the go-to tool for broad questions about the team, ratings trends, team performance, or "how is the team doing?".',
      inputSchema: z.object({
        zone: z
          .enum(['FOH', 'BOH'])
          .optional()
          .describe('Filter to front-of-house or back-of-house employees only'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getTeamOverview(input, orgId, locationId, {
          certificationsEnabled: features?.certifications ?? false,
        });
      },
    }),
    get_discipline_summary: tool({
      description:
        'Get discipline data. With employee_id: detailed discipline history (infractions, actions, pending recommendations). Without employee_id: location-wide overview (top point holders, infraction breakdown, recent actions). Use this for discipline-specific questions — not for ratings.',
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
    get_position_rankings: tool({
      description:
        'Rank employees for a SINGLE position the user explicitly named (e.g. "who is the best host?"). NEVER call this tool more than once — if the user asks about ratings in general, trends, or overall performance, call get_team_overview instead. get_team_overview already includes per-position averages and top/bottom performers.',
      inputSchema: z.object({
        position: z
          .string()
          .describe('Position name to rank by (e.g., "Bagging", "iPOS", "Host", "Breader")'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of ranked employees to return (default: 5)'),
        sort: z
          .enum(['best', 'worst'])
          .optional()
          .describe('Sort order: "best" (highest first) or "worst" (lowest first). Default: "best"'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getPositionRankings(input, orgId, locationId);
      },
    }),

    // ── Display tools — the LLM decides when to show visual cards ──

    show_employee_list: tool({
      description:
        'Display a visual ranked-list card in the chat. Use this when you want to highlight a group of employees — top performers, employees needing improvement, position rankings, etc. Only call AFTER you have fetched data and want to present a visual summary. Not every response needs a card — only use when the visual genuinely adds value.',
      inputSchema: z.object({
        title: z.string().describe('Card title (e.g. "Top Performers", "Needs Improvement", "Top iPOS")'),
        employees: z.array(
          z.object({
            employee_id: z.string().optional().describe('Employee UUID if available from the data'),
            name: z.string().describe('Employee full name'),
            role: z.string().optional().describe('Employee role'),
            metric_label: z.string().optional().describe('Label for the metric (e.g. "Avg Rating", "Points")'),
            metric_value: z.number().optional().describe('Numeric value for the metric'),
          })
        ).describe('Employees to display (max 10)'),
      }),
      execute: async ({ title, employees }: { title: string; employees: Array<{ employee_id?: string; name: string; role?: string; metric_label?: string; metric_value?: number }> }) => {
        return {
          __display: true,
          blockType: 'employee-list',
          blockId: `list-${Date.now()}`,
          payload: {
            title,
            employees: employees.slice(0, 10).map((e, i) => ({
              employee_id: e.employee_id || '',
              name: e.name,
              role: e.role || '',
              rank: i + 1,
              metric_label: e.metric_label,
              metric_value: e.metric_value,
            })),
          },
        };
      },
    }),

    show_employee_card: tool({
      description:
        'Display a visual card for a single employee. Use this when looking up or highlighting one specific employee. Only call AFTER you have fetched data about the employee.',
      inputSchema: z.object({
        employee_id: z.string().optional().describe('Employee UUID if available from the data'),
        name: z.string().describe('Employee full name'),
        role: z.string().optional().describe('Employee role'),
        rating_avg: z.number().optional().describe('Overall rating average if available'),
        current_points: z.number().optional().describe('Current discipline points if relevant'),
      }),
      execute: async (input: { employee_id?: string; name: string; role?: string; rating_avg?: number; current_points?: number }) => {
        return {
          __display: true,
          blockType: 'employee-card',
          blockId: `card-${input.employee_id || Date.now()}`,
          payload: {
            employee_id: input.employee_id || '',
            name: input.name,
            role: input.role || '',
            rating_avg: input.rating_avg,
            current_points: input.current_points,
          },
        };
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

    // 8. Build tools (location-scoped when available, feature-aware)
    const leviTools = buildTools(orgId, locationId, orgContext?.features);

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

                // Emit custom tool status labels for data-fetching tools only
                // (display tools like show_employee_list are silent)
                const DISPLAY_TOOLS = new Set(['show_employee_list', 'show_employee_card']);

                if (step.toolCalls && step.toolCalls.length > 0) {
                  toolCallCount += step.toolCalls.length;

                  for (let i = 0; i < step.toolCalls.length; i++) {
                    const tc = step.toolCalls[i] as { toolCallId: string; toolName: string; input: Record<string, unknown> };

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

                // Persist tool messages and emit UI blocks from display tools
                if (step.toolCalls && step.toolCalls.length > 0) {
                  // Only persist data-fetching tool calls (not display tools)
                  const dataToolCalls = step.toolCalls
                    .filter((tc: any) => !DISPLAY_TOOLS.has(tc.toolName))
                    .map((tc: any) => ({
                      id: tc.toolCallId,
                      type: 'function' as const,
                      function: {
                        name: tc.toolName,
                        arguments: JSON.stringify(tc.input),
                      },
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
                      const outputStr = typeof output === 'string'
                        ? output
                        : JSON.stringify(output);

                      // Check if this is a display tool result (has __display flag)
                      const isDisplay = typeof output === 'object' && output !== null && (output as any).__display;

                      if (isDisplay) {
                        // Emit as UI block directly — the LLM chose to show this
                        const block = {
                          blockType: (output as any).blockType as string,
                          blockId: (output as any).blockId as string,
                          payload: (output as any).payload as Record<string, unknown>,
                        };
                        allUIBlocks.push(block);
                        writer.write({
                          type: 'data-ui-block' as any,
                          data: block,
                        });
                      } else {
                        // Persist data tool result (display tool results are ephemeral)
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

            // Merge the AI SDK stream into our UI message stream
            writer.merge(result.toUIMessageStream({
              sendStart: false,
              onError: (error) => {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error('[Chat] Primary stream error:', { error: errMsg, model: 'primary' });
                return "I'm having trouble right now. Please try again.";
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
                  const errMsg = error instanceof Error ? error.message : String(error);
                  console.error('[Chat] Escalation stream error:', { error: errMsg, model: 'escalation' });
                  return "I'm having trouble right now. Please try again.";
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
              uiBlocks: allUIBlocks.length > 0 ? allUIBlocks : undefined,
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
