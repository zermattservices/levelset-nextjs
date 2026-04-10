# Levi Agent Optimization: Single-Model Architecture

**Date:** 2025-03-25
**Status:** Design
**Author:** Andrew Dyar + Claude

## Summary

Replace Levi's three-phase orchestrator-worker pipeline with a single Claude Sonnet 4.6 agent using native tool calling and adaptive thinking. This eliminates the Opus orchestrator call, removes MiniMax as the worker, simplifies the codebase, improves response quality through feedback loops (the model sees tool results before deciding next steps), and reduces per-request cost.

## Motivation

### Current Architecture Pain Points

1. **Plan quality is the primary bottleneck.** The orchestrator (Opus 4.6 via `generateObject`) plans tool calls without seeing results — it can't adapt based on what tools return. If it plans the wrong tool or wrong args, the response quality suffers regardless of how good the worker is.

2. **The "planning" is trivial for Levi's workload.** Every tool is a read-only Supabase query. Most requests need 1-2 tool calls. The orchestrator is a $0.015/request Opus call to decide between ~13 tools — something Sonnet 4.6 handles natively with tool calling.

3. **MiniMax mandatory reasoning wastes tokens.** The `<think>` tags on M2.5/M2.7 are always-on, adding ~50% output token overhead. The worker role is data synthesis, not reasoning.

4. **Three LLM-related modules to maintain.** orchestrator.ts, worker.ts, and tool-executor.ts add complexity without proportional value for the current read-only tool set.

### Why Now

- Claude Sonnet 4.6 with adaptive thinking + interleaved thinking handles multi-step tool reasoning natively
- OpenRouter confirmed to pass through `cache_control` for prompt caching
- Anthropic's own engineering guidance (context engineering article, effective harnesses article) recommends single capable agents over rigid orchestrator-worker splits for modern Claude models
- The original architecture was based on "Building Effective Agents" (Dec 2024), written for Claude 3.5 Sonnet. The models have advanced significantly since then.

## Quality Improvements (Primary Goal)

The architecture change produces better responses for five specific reasons, each grounded in first-party Anthropic guidance:

### 1. Full Conversation Awareness

**Current problem:** The orchestrator only sees a compressed summary of the last 5 messages:
```
User asked: "who is the best host?" Levi responded about **Jack Rivera** leads...
```
This loses nuance — follow-up questions like "what about their discipline?" lose context about which employee was just discussed.

**Fix:** The single model sees the full conversation history (up to 20 messages), exactly as the legacy fallback path already does. No more information loss from compression.

### 2. Feedback Loop (Interleaved Thinking)

**Current problem:** The orchestrator plans tool calls blind — it decides "call get_employee_profile for employee X" without knowing whether lookup_employee found a match. If the plan is wrong, the worker synthesizes garbage.

**Fix:** With Sonnet 4.6's interleaved thinking (automatic in adaptive mode), the model reasons between tool calls:
```
[thinking: "User asked about John. Let me look him up."]
→ [tool: lookup_employee({name: "John"})]
→ [thinking: "Found two Johns — John Smith and John Rivera. The conversation
   was about hosts, and John Rivera is a host. I'll get his profile."]
→ [tool: get_employee_profile({employee_id: "john-rivera-uuid"})]
→ [thinking: "His rating is 2.8 and he has 3 discipline points. The user
   asked if he should be promoted — I need to weigh both factors."]
→ [text: final analytical response]
```

This is the single biggest quality improvement. Source: Anthropic's "Effective Context Engineering" article — "Autonomous data navigation enables incremental context discovery... Agents assemble understanding layer-by-layer."

### 3. No More "Telephone Game"

**Current problem:** Three separate models/prompts interpret the user's intent:
1. Orchestrator decides what the user *probably* wants (via compressed summary)
2. Orchestrator writes a `synthesisDirective` telling the worker how to present results
3. Worker interprets the directive and generates the response

Each handoff loses fidelity. The synthesisDirective is essentially a prompt-within-a-prompt.

**Fix:** One model reads the question, fetches the data, and answers it. No translation layers.

### 4. Better Instruction Following

**Current problem:** MiniMax M2.5 occasionally leaks forbidden phrases ("Let me check...", "Based on the data...") and doesn't follow formatting rules as precisely as Claude.

**Fix:** Claude Sonnet 4.6 has significantly better instruction following than MiniMax, especially with the softened 4.6-style prompting. Per Anthropic's prompting best practices: "Claude 4.6 models are more direct and grounded — provides fact-based progress reports rather than self-celebratory updates."

### 5. Adaptive Complexity

**Current problem:** Every request pays the same Opus orchestrator cost ($0.015) whether the user says "hi" or asks for a multi-dimensional team analysis.

**Fix:** Adaptive thinking scales reasoning to query complexity. Simple lookups get fast, minimal thinking. Complex analytical questions get deeper reasoning. The effort parameter (`medium`) provides a soft ceiling. Source: Anthropic adaptive thinking docs — "Claude evaluates the complexity of each request and determines whether and how much to use extended thinking."

## Architecture

### Before

```
Request → Orchestrator (Opus 4.6, generateObject)     ~$0.015
        → Tool Executor (deterministic, parallel)       ~$0.000
        → Worker (MiniMax M2.5, streamText + display)   ~$0.002
        → SSE to mobile app
        Total: ~$0.017/request
```

### After

```
Request → Claude Sonnet 4.6 (streamText, adaptive thinking, all tools)  ~$0.012
        → onStepFinish intercepts tool calls → SSE status labels
        → onStepFinish intercepts display tools → UI block events
        → SSE to mobile app
        Total: ~$0.012/request (before caching)
        With caching: ~$0.007/request
```

### Model Configuration

```typescript
// ai-provider.ts
export const models = customProvider({
  languageModels: {
    primary: openrouter('anthropic/claude-sonnet-4-6'),
    escalation: openrouter('anthropic/claude-opus-4-6'),
  },
});
```

- **Primary:** Claude Sonnet 4.6 — adaptive thinking, interleaved thinking (automatic), `medium` effort
- **Escalation:** Claude Opus 4.6 — via OpenRouter `models` array fallback, not code-level try/catch
- **Removed:** MiniMax M2.5 (`primary`), Claude Sonnet 4.5 (`escalation`), Gemini 2.5 Flash (`batch`)

### Reasoning Configuration via OpenRouter

```typescript
// Passed via AI SDK provider settings or request body
{
  reasoning: { enabled: true },  // Adaptive thinking on Sonnet 4.6
  verbosity: "medium",           // Effort level
}
```

If the `@ai-sdk/openai-compatible` provider doesn't pass these through, they can be set via `headers` or `extraBody` on the provider configuration. Verify during implementation.

### Fallback Strategy

Replace the current three-level try/catch (pipeline → MiniMax legacy → Sonnet 4.5 escalation) with OpenRouter's native fallback:

```typescript
// In the streamText call, pass models array via provider settings
// OpenRouter handles failover automatically
models: ['anthropic/claude-sonnet-4-6', 'anthropic/claude-opus-4-6']
```

**Triggers:** context length errors, rate limiting, provider downtime, moderation flags.
**Billing:** Only the model that responds is charged.

If OpenRouter's `models` array isn't passable through the AI SDK's `@ai-sdk/openai-compatible` provider, fall back to a simple code-level try/catch with two models (much simpler than current three-level cascade).

## System Prompt

### Design Principles

Per Claude 4.6 prompting best practices (first-party Anthropic docs):

1. **Soften aggressive language.** Replace `ABSOLUTELY NEVER`, `CRITICAL`, `follow these EXACTLY` with natural instructions. 4.6 overtriggers on language that was necessary for earlier models.
2. **Explain why, not just what.** "The mobile app UI shows tool loading states to users, so your text should contain only the final analysis" is better than "NEVER narrate what you are doing."
3. **Use XML structure.** Separate identity, tool guidance, org context, and output rules into tagged sections for unambiguous parsing.
4. **Remove tool selection micro-management.** The current prompt has 8 numbered rules about which tools to call. Sonnet 4.6 with good tool descriptions handles this natively. Keep 2-3 high-level guidelines, move the detail into tool descriptions where it belongs.
5. **Remove redundant forbidden phrases.** Claude 4.6 is naturally more direct. The 12-line forbidden phrases list can be reduced to 2-3 lines of positive guidance.
6. **Merge orchestrator and worker prompts.** Currently there are three separate prompts (orchestrator, worker, legacy system prompt). Consolidate into one.

### Prompt Structure

```xml
<identity>
You are Levi, an AI assistant powered by Levelset for restaurant managers.
Respond in the same language the user writes in (English or Spanish).
</identity>

<style>
{style instruction — concise/brief/structured}
</style>

<output_rules>
The mobile app shows tool-loading indicators to users, so your text response
should contain only the final polished analysis — no narration of tool calls
or data fetching.

When a visual card adds genuine value (top performers, employee lookup),
call show_employee_list or show_employee_card. For analytical questions,
text-only answers are usually clearer. If you show a card, add insight
beyond what the card displays.

Use standard markdown. Bold only names and key numbers. Use bullet points
for structure in longer responses. Lead with your answer, then reasoning.
</output_rules>

<tool_guidance>
Most questions need 1-2 tool calls. Prefer get_team_overview for broad
team questions. Use get_pillar_scores for OE/pillar questions.
Use lookup_employee first when you need an employee_id for other tools.
</tool_guidance>

<domain_knowledge>
{core context from levi_core_context — Tier 1}
</domain_knowledge>

<org_context>
{formatted org context — roles, positions, thresholds, rubrics, features, pillars}
</org_context>

<relevant_context>
{semantic chunks + PageIndex reasoning — Tier 2+3, when available}
</relevant_context>

<session>
User: {userName}. Date: {today}.
Feature awareness: only reference features in the Active Features list.
</session>
```

**Estimated token count:** ~1200-1800 tokens (down from ~1400-2100 due to removing redundant rules).

### What Moves to Tool Descriptions

The current system prompt contains tool-specific rules like "NEVER call get_position_rankings more than once" and "get_employee_profile gives ratings + discipline in one call — do NOT also call separate ratings/infractions tools." These belong in the tool descriptions themselves:

```typescript
get_position_rankings: tool({
  description:
    'Rank employees for a SINGLE position by rating average. ' +
    'Only use for specific single-position questions like "who is the best host?" ' +
    'For general team ratings or trends, use get_team_overview instead.',
  // ...
})
```

This is better because:
- Tool descriptions are always visible when the model is deciding which tools to call
- System prompt stays focused on identity and output behavior
- Follows Anthropic's ACI (Agent-Computer Interface) guidance: "Tools require equivalent prompt engineering attention as primary prompts"

### Enhanced Tool Descriptions

Each tool description should be improved to guide the model's selection. Key changes:

| Tool | Current Description Issue | Enhanced Description Adds |
|------|--------------------------|---------------------------|
| `get_team_overview` | Doesn't mention it's the default for broad questions | "This is the primary tool for broad team, rating, and performance questions. One call returns role breakdown, position averages, top/bottom performers, and discipline flags." |
| `get_position_rankings` | Doesn't warn against overuse | "Only for specific single-position questions. For general ratings or trends, use get_team_overview." |
| `get_employee_profile` | Doesn't mention it bundles ratings + discipline | "Returns details, recent ratings with trend, AND discipline history in one call. No need to call separate ratings or discipline tools after this." |
| `get_pillar_scores` | Doesn't clarify OE vs ratings | "For Operational Excellence / pillar / WHED questions. NOT for general ratings — use get_team_overview for that." |
| `lookup_employee` | Fine as-is | Add: "Call this first when you need an employee_id for other tools." |
| `show_employee_list` | Doesn't discourage overuse | "Only call when a visual list genuinely adds value. Not every response needs a card. For analytical answers, text is usually clearer." |
| `show_employee_card` | Same issue | Same guidance — visual only when helpful. |

The goal is to push tool-selection intelligence into the tool descriptions themselves, so the system prompt doesn't need to micro-manage.

## Tool System

### No Changes to Tools Themselves

All 13 data tools and 2 display tools remain exactly as they are. The Zod schemas, executor functions, and return formats are unchanged. The only change is how they're registered and invoked.

### Unified Tool Builder

Replace the current split (`buildAllTools` for legacy, `buildDisplayTools` for worker, `getToolSummaries` for orchestrator) with a single function:

```typescript
export function buildTools(ctx: ToolRegistryContext): ToolSet {
  // Same tool definitions as current buildAllTools()
  // Feature gating preserved (org chart, evaluations)
  // Display tools included
}
```

Remove:
- `buildDisplayTools()` — merged into `buildTools()`
- `getToolSummaries()` — was only used by orchestrator prompt
- `TOOL_META` registry — summaries no longer needed (model reads tool descriptions directly)
- `buildAllTools()` — renamed to `buildTools()`

Keep:
- `executeTool()` — standalone dispatcher used by tool `execute` callbacks (not related to deleted tool-executor.ts)
- `getToolCallLabel()` — still used for SSE status labels
- Feature gating logic
- All tool implementations in `src/tools/data/`

### Tool Call Interception for SSE

The current `onStepFinish` pattern in the legacy fallback path already does exactly what we need. The worker's `onStepFinish` also does this for display tools. We unify both into one callback:

```typescript
streamText({
  model: models.languageModel('primary'),
  system: systemPrompt,
  messages: llmMessages,
  tools: buildTools(registryCtx),
  stopWhen: stepCountIs(MAX_TOOL_STEPS),
  experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' }),
  onStepFinish: async (step) => {
    // 1. Emit tool-status labels for data tools
    if (step.toolCalls) {
      for (const tc of step.toolCalls) {
        if (!DISPLAY_TOOLS.has(tc.toolName)) {
          writer.write({
            type: 'data-tool-status',
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

    // 2. Emit UI block events for display tools
    if (step.toolResults) {
      for (const tr of step.toolResults) {
        const output = tr.output;
        if (typeof output === 'object' && output?.__display) {
          writer.write({
            type: 'data-ui-block',
            data: {
              blockType: output.blockType,
              blockId: output.blockId,
              payload: output.payload,
            },
          });
        }
      }
    }

    // 3. Persist tool messages to DB
    // (same pattern as current legacy path)
  },
});
```

This is nearly identical to the current legacy fallback code in `chat.ts` lines 514-593. The main simplification is removing the pipeline-specific tracking variables.

### Tool Step Limit

`stopWhen: stepCountIs(5)` — same as the current legacy path's `MAX_TOOL_STEPS`. This allows up to 4 data tool calls + 1 display tool call in a single response. In practice, most requests use 1-2 steps.

This limit prevents runaway tool loops. With a single model making adaptive decisions, the risk of unnecessary calls is lower than with the orchestrator (which sometimes over-planned), but the safety limit remains important.

## Chat Route Simplification

### Current Flow (chat.ts — 785 lines)

1. Parse request, resolve org context, rate limit
2. Parallel load: conversation, org context, retrieved context
3. Persist user message, load history, build system prompt
4. **Try pipeline:** orchestrator → tool executor → worker synthesis
5. **Catch → legacy fallback:** MiniMax with all tools
6. **Catch → escalation:** Sonnet 4.5 with all tools
7. Persist assistant message, log usage

### Proposed Flow

1. Parse request, resolve org context, rate limit (unchanged)
2. Parallel load: conversation, org context, retrieved context (unchanged)
3. Persist user message, load history, build system prompt (unchanged)
4. **Single `streamText` call** with Sonnet 4.6, all tools, adaptive thinking
5. Persist assistant message, log usage (simplified)

The streaming path reduces from ~340 lines (steps 4-6) to ~80 lines. The non-streaming path simplifies proportionally.

### Error Handling

```typescript
try {
  const result = streamText({
    model: models.languageModel('primary'),
    // ... config
  });
  writer.merge(result.toUIMessageStream({ /* ... */ }));
  assistantContent = await result.text;
} catch (primaryError) {
  // Single fallback to Opus 4.6
  const fallbackResult = streamText({
    model: models.languageModel('escalation'),
    // ... same config
  });
  writer.merge(fallbackResult.toUIMessageStream({ /* ... */ }));
  assistantContent = await fallbackResult.text;
  escalated = true;
}
```

Two levels instead of three. If OpenRouter `models` array works through the AI SDK, this becomes zero code-level fallback handling.

## Prompt Caching

### Strategy

Use OpenRouter's Anthropic prompt caching passthrough. The system prompt + org context are stable within a conversation session — perfect for caching.

The AI SDK's `@ai-sdk/openai-compatible` provider may or may not pass `cache_control` through to OpenRouter. Two implementation paths:

**Path A (preferred):** If the provider supports passing extra fields on message content blocks, add `cache_control: {type: "ephemeral"}` to the system prompt content block.

**Path B (fallback):** If not, pass cache_control via the provider's `extraBody` or `headers` configuration, or use OpenRouter's top-level `cache_control` field (automatic caching on last cacheable block).

### Expected Savings

System prompt + org context: ~1500 tokens
- First request: 1.25x write cost = ~$0.0056
- Subsequent requests: 0.1x read cost = ~$0.00045
- **~90% savings on the cached portion for requests 2+ in a conversation**

### Minimum Token Threshold

Sonnet 4.6 minimum cacheable length: **2048 tokens.** The system prompt alone is ~1200-1800 tokens. With org context, it should clear 2048 consistently. If not, we can consolidate the system prompt sections or include tool definitions in the cached prefix (tool definitions are stable per session and add significant token count).

## Usage Tracking

### Simplified Schema

Remove pipeline-specific fields from `logUsage`:

```typescript
// Remove these fields:
orchestratorModel, orchestratorInputTokens, orchestratorOutputTokens, orchestratorCostUsd
workerModel, workerInputTokens, workerOutputTokens, workerCostUsd
fallback

// Keep:
orgId, userId, conversationId, model, tier, taskType,
inputTokens, outputTokens, latencyMs, escalated, toolCount, toolDurationMs
```

### Pricing Table Update

```typescript
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4-6': { input: 5.0, output: 25.0 },
};
```

Remove MiniMax M2.5, Claude Sonnet 4.5, and Gemini 2.5 Flash entries.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ai-provider.ts` | **Modify** | Update model aliases: primary → Sonnet 4.6, escalation → Opus 4.6. Remove orchestrator, batch. |
| `src/routes/ai/chat.ts` | **Modify** | Replace pipeline + legacy + escalation with single streamText path. Simplify from ~785 to ~500 lines. |
| `src/lib/prompts.ts` | **Modify** | Merge into single system prompt with XML structure. Soften language for 4.6. |
| `src/lib/tool-registry.ts` | **Modify** | Consolidate to single `buildTools()`. Remove `buildDisplayTools()`, `getToolSummaries()`, `buildAllTools()`. Enhance tool descriptions with selection guidance. |
| `src/lib/usage-tracker.ts` | **Modify** | Remove pipeline-specific fields. Update pricing table. |
| `src/lib/orchestrator.ts` | **Delete** | No longer needed — model handles tool selection natively. |
| `src/lib/worker.ts` | **Delete** | No longer needed — model handles synthesis natively. |
| `src/lib/tool-executor.ts` | **Delete** | No longer needed — AI SDK tool loop replaces deterministic execution. |

### Files Unchanged

| File | Reason |
|------|--------|
| `src/tools/data/*.ts` | All tool implementations unchanged |
| `src/lib/conversation-manager.ts` | Conversation lifecycle unchanged |
| `src/lib/context-retriever.ts` | 3-tier RAG unchanged |
| `src/lib/org-context.ts` | Org config loading unchanged |
| `src/lib/tenant-cache.ts` | Caching layer unchanged |
| `src/lib/embeddings.ts` | Embedding generation unchanged |
| `src/lib/pageindex.ts` | PageIndex integration unchanged |
| `src/lib/access-guard.ts` | Permission enforcement unchanged |
| `src/lib/ui-blocks.ts` | UI block types unchanged |
| `src/lib/types.ts` | Type definitions unchanged |
| `src/middleware/auth.ts` | Auth middleware unchanged |
| `src/routes/health.ts` | Health check unchanged |
| `src/routes/cache.ts` | Cache management unchanged |
| `src/index.ts` | App setup unchanged |

## Parallel Tool Execution

### What We Lose

The current tool-executor.ts runs independent steps in parallel via `Promise.all`. The AI SDK's `streamText` tool loop is sequential by default — it calls one tool, waits for the result, then decides the next action.

### Why It's Acceptable

1. Most Levi queries need 1-2 tool calls. Parallel execution of 2 Supabase queries saves ~50-100ms — noticeable but not critical.
2. The model gains something more valuable: it can **adapt** between calls. If `lookup_employee` returns no results, it can try a different search instead of executing a pre-planned `get_employee_profile` on a nonexistent ID.
3. The `dependsOn` injection logic in tool-executor.ts (parsing lookup_employee results to extract employee_id) was a workaround for the orchestrator not seeing tool results. With native tool calling, the model naturally chains `lookup_employee` → `get_employee_profile` using the returned ID.

### Future: Parallel Tool Calls

Claude Sonnet 4.6 supports parallel tool calling natively. The AI SDK supports it via the tool loop. If latency becomes an issue for multi-tool queries, we can add prompting to encourage parallel calls:

```xml
<tool_guidance>
When multiple independent tools are needed, call them in parallel.
</tool_guidance>
```

Per Claude 4.6 docs, this can be boosted to ~100% with explicit prompting. Not needed for v1 but available if needed.

## Migration Safety

### Rollback Plan

The current pipeline code is not being modified — it's being replaced. If the new architecture has issues in production:

1. Git revert to the pre-change commit
2. Redeploy to Fly.io (takes ~2 minutes)
3. All existing conversation data is compatible (message format unchanged)

### Testing Before Deploy

1. **Local testing:** Run agent locally (`pnpm dev:agent`), hit `/api/ai/chat` with test messages
2. **Verify SSE events:** Confirm `data-tool-status` and `data-ui-block` events emit correctly
3. **Verify tool calling:** Test each tool type — lookup, team overview, discipline, rankings, schedule, pillar scores
4. **Verify display tools:** Confirm `show_employee_list` and `show_employee_card` produce correct UI blocks
5. **Verify escalation:** Temporarily break the primary model config to confirm fallback works
6. **Verify conversation persistence:** Check that messages persist correctly in `ai_messages`

### Deploy Strategy

Deploy to `levelset-agent-dev` (develop branch) first. Test with real mobile app pointed at dev. Promote to production after validation.

## Cost Projection

### Per-Request Estimate

| Component | Current | Proposed |
|-----------|---------|----------|
| Orchestrator (Opus 4.6) | ~$0.015 | $0 |
| Worker (MiniMax M2.5 + reasoning) | ~$0.002 | $0 |
| Single model (Sonnet 4.6) | $0 | ~$0.012 |
| **Total** | **~$0.017** | **~$0.012** |
| **With prompt caching** | **~$0.010** | **~$0.007** |

### Monthly Estimate (at 1000 requests/day)

| Scenario | Current | Proposed |
|----------|---------|----------|
| Without caching | ~$510/mo | ~$360/mo |
| With caching | ~$300/mo | ~$210/mo |

**~30% cost reduction** without caching, **~30% cost reduction** with caching, plus improved quality.

## Future Architecture (Not In Scope, But Enabled by This Change)

This section documents how the single-model architecture positions Levi for future evolution toward a full agentic system. None of this is in scope for v1 — it's here to confirm the architecture doesn't box us in.

### Write Operations / Action Tools

The current tool system is read-only. The single-model architecture supports action tools naturally:

```typescript
submit_infraction: tool({
  description: 'Submit a new infraction for an employee. Requires confirmation.',
  inputSchema: z.object({
    employee_id: z.string(),
    infraction_type: z.string(),
    notes: z.string().optional(),
  }),
  execute: async (args) => {
    // Future: confirmation step before writing
  },
})
```

With interleaved thinking, the model can reason about whether an action is appropriate before calling the tool.

### Background Agent (OpenClaw-Style)

The long-term vision is for Levi to run background tasks for the organization — daily team health reports, automated scheduling analysis, proactive discipline alerts. This architecture supports it because:

1. **Same tool set** — background tasks use the same `buildTools()` function
2. **No orchestrator dependency** — the agent can reason autonomously about which tools to call
3. **Memory tool** (future) — Anthropic's memory tool can be added for cross-session learning, building org-specific knowledge over time
4. **Context editing** (future) — for long-running background tasks that exceed context limits

### Multi-Step Research

Complex analytical queries ("prepare a promotion readiness report for all team leads") could involve 5-10 tool calls with reasoning between each. The single-model architecture handles this natively via the tool loop — no plan-size limitations like the current max-4-step orchestrator plan.

## Non-Goals (Explicit)

- **No new tools.** This is an architecture change, not a feature change.
- **No write operations / action tools.** That's a future project.
- **No memory tool integration.** Future project — the architecture supports it but we're not adding it now.
- **No changes to the mobile app.** SSE event format is identical.
- **No changes to conversation management.** Same 24-hour TTL, same history loading, same persistence.
- **No changes to auth/permissions.** Same middleware, same access checks.

## Sources

All architectural decisions are grounded in first-party documentation:

| Decision | Source |
|----------|--------|
| Single-model over orchestrator-worker | Anthropic: "Effective Context Engineering for AI Agents" — "as models improve, they require less prescriptive engineering, enabling greater autonomy" |
| Adaptive thinking over manual budget_tokens | Anthropic: Claude 4.6 platform docs — "adaptive thinking reliably drives better performance than extended thinking" |
| Softened prompting for 4.6 | Anthropic: "Claude Prompting Best Practices" — "4.6 models may overtrigger on instructions that were needed for previous models" |
| Tool selection in descriptions, not system prompt | Anthropic: "Building Effective Agents" — ACI guidance: "Tools require equivalent prompt engineering attention as primary prompts" |
| Interleaved thinking for tool reasoning | Anthropic: Claude 4.6 adaptive thinking docs — "automatically enables interleaved thinking... especially effective for agentic workflows" |
| Prompt caching via OpenRouter | OpenRouter: "Prompt Caching" guide — confirms `cache_control` passthrough with provider sticky routing |
| XML-structured system prompts | Anthropic: "Claude Prompting Best Practices" — "XML tags help Claude parse complex prompts unambiguously" |
| Single model with memory for long-running agents | Anthropic: "Effective Harnesses for Long-Running Agents" — initializer + coding agent pattern with memory files |
| Effort parameter at medium | Anthropic: Sonnet 4.6 migration guide — "Medium effort: recommended default for most applications" |
