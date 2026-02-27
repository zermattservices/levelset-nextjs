# Levi AI Agent: Orchestrator-Worker Architecture Redesign

## Context

Levi currently uses a single-model architecture: MiniMax M2.5 handles everything (tool selection, data fetching, response generation) with Claude Sonnet as a failure-only escalation. Based on Anthropic's "Building Effective Agents" guidance, we're refactoring to an **Orchestrator-Worker pipeline** where:

- **Opus 4.6** (orchestrator) plans what data to fetch and how to analyze it
- **Tools execute deterministically** from the plan (no LLM-driven tool loop)
- **MiniMax M2.5** (worker) synthesizes tool results into the user-facing response

This also adds read-only scheduling and evaluation tools, consolidates redundant tools, and improves tool design following poka-yoke principles.

---

## 1. Architecture Overview

```
User message
  ↓
Orchestrator (Opus 4.6)
  Input: user message + conversation history + org context summary
  Output: structured JSON plan
  ↓
Tool Executor (deterministic)
  Execute planned tools in parallel where possible
  Retry once on transient failures
  ↓
Worker (MiniMax M2.5)
  Input: tool results + synthesis directive + conversation history
  Output: streamed response + optional display tool calls
  ↓
SSE stream to mobile app (same protocol as today)
```

**UX is invisible** — the user sees the same tool-status events, text streaming, and UI blocks as today. No "thinking" indicator.

### Cost Model
- Orchestrator: ~200-500 input tokens (message + context summary), ~100-300 output tokens (plan). At Opus rates (~$15/$75 per 1M via OpenRouter): **~$0.005-0.025 per request**
- Worker: ~500-3000 input tokens (tool results + directive + history), ~100-500 output tokens. At MiniMax rates ($0.30/$1.20 per 1M): **~$0.0005-0.004 per request**
- Total: **~$0.006-0.029 per request** (up from ~$0.001-0.005 today)

---

## 2. Orchestrator Design

### File: `apps/agent/src/lib/orchestrator.ts` (NEW)

The orchestrator receives a **compressed context** (not the full system prompt) and outputs a structured plan.

### Orchestrator Input
```typescript
interface OrchestratorInput {
  userMessage: string;
  conversationSummary: string;    // Last 3-5 messages summarized, not full history
  orgContextSummary: string;      // Compressed org context (~200 tokens)
  availableTools: string[];       // Tool names available for this org/location
}
```

### Orchestrator Output (structured JSON via Vercel AI SDK `generateObject`)
```typescript
interface ExecutionPlan {
  steps: PlanStep[];              // Ordered tool calls
  synthesisDirective: string;     // Instructions for the worker
  maxSteps: number;               // 1-10, orchestrator's estimate
  responseStyle: 'concise' | 'detailed' | 'list';
}

interface PlanStep {
  tool: string;                   // Tool name
  args: Record<string, unknown>;  // Tool arguments
  purpose: string;                // Why this tool is called (for worker context)
  dependsOn?: number;             // Step index this depends on (for sequential execution)
}
```

### Orchestrator System Prompt
Lean prompt (~400 tokens) focused on:
- Available tools with one-line descriptions
- Org context summary (location, roles, features enabled)
- Rules: max 4 tool calls per plan, prefer `get_employee_profile` over separate ratings/infractions calls, use `get_team_overview` for broad questions
- Output format: the `ExecutionPlan` schema

The orchestrator does NOT see conversation history verbatim — it gets a 2-3 sentence summary of recent context to keep input tokens minimal.

### Conversation Summary
Built from the last 3-5 messages:
```typescript
function summarizeConversation(messages: ChatMessage[]): string {
  // Take last 5 user+assistant messages
  // Format as: "User asked about X. Levi responded with Y. User then asked Z."
  // Cap at ~100 tokens
}
```

---

## 3. Tool Executor

### File: `apps/agent/src/lib/tool-executor.ts` (NEW)

Executes tools **deterministically** from the orchestrator's plan — no LLM in the loop.

```typescript
interface ToolResult {
  tool: string;
  stepIndex: number;
  purpose: string;       // From plan, passed to worker
  data: unknown;         // Tool output
  error?: string;        // If tool failed
  durationMs: number;
}

async function executePlan(
  plan: ExecutionPlan,
  toolRegistry: ToolRegistry,
  orgId: string,
  locationId?: string
): Promise<ToolResult[]>
```

### Execution Strategy
1. Group steps by dependency: steps without `dependsOn` run in parallel
2. Sequential steps wait for their dependency to complete
3. Each tool gets **1 retry** on transient error (network timeout, 5xx from Supabase) with 500ms delay
4. Failed tools include error message in result (worker can still generate a partial response)

### SSE Events During Execution
Emit `data-tool-status` events as tools execute (same as today):
```typescript
// For each tool starting execution:
emit('data-tool-status', { tool: 'get_team_overview', label: 'Analyzing team performance' });
```

Human-readable labels are mapped from tool names (existing pattern in chat.ts).

---

## 4. Worker Design

### File: `apps/agent/src/lib/worker.ts` (NEW)

The worker (MiniMax M2.5) receives tool results and generates the streamed response.

### Worker Input
```typescript
interface WorkerInput {
  synthesisDirective: string;     // From orchestrator
  responseStyle: 'concise' | 'detailed' | 'list';
  toolResults: ToolResult[];      // All tool outputs
  conversationHistory: ModelMessage[];  // Full conversation (up to 20 messages)
  orgContext: string;             // Full org context for domain accuracy
  userName: string;
  currentDate: string;
}
```

### Worker System Prompt
The worker gets a **focused synthesis prompt** (~300 tokens):
- Identity section (who is Levi, tone rules)
- Forbidden phrases list (same as today)
- Display tool instructions (when to show cards)
- The `synthesisDirective` from the orchestrator
- Response style instruction

The worker does NOT get tool selection rules (it doesn't select tools). It focuses purely on data interpretation and response generation.

### Worker Tool Access
The worker has access to **display tools only** (`show_employee_list`, `show_employee_card`). It decides whether to render UI cards based on the data, same as today. These are Vercel AI SDK `tool()` calls within `streamText()`.

### Streaming
Worker uses `streamText()` with `smoothStream()` (same 15ms word chunking as today). The SSE protocol is identical — the mobile app sees no difference.

---

## 5. Tool Consolidation

### Remove (2 tools)
- **`get_employee_ratings`** — Redundant with `get_employee_profile` which includes ratings + trend
- **`get_employee_infractions`** — Redundant with `get_employee_profile` which includes infractions + points

### Keep (6 existing tools)
- `lookup_employee` — Find employee by name
- `list_employees` — List with filters
- `get_employee_profile` — Comprehensive one-shot (ratings + discipline + trend)
- `get_team_overview` — Location-wide snapshot
- `get_discipline_summary` — Discipline deep dive (location or individual)
- `get_position_rankings` — Rank employees for one position
- `get_pillar_scores` — OE pillar scores

### Add (4 new tools)

#### `get_schedule_overview`
```typescript
// Input
{ week_start?: string }  // defaults to current week
// Output: schedule status, shifts with assignments, coverage summary, total hours/cost
// Tables: schedules, shifts, shift_assignments, employees
// Cache: DYNAMIC (2 min)
```

#### `get_employee_schedule`
```typescript
// Input
{ employee_id: string, weeks?: number }  // defaults to 2 (this + next)
// Output: employee's shifts with times, positions, breaks
// Tables: shift_assignments, shifts, org_positions
// Cache: DYNAMIC (2 min)
```

#### `get_labor_summary`
```typescript
// Input
{ week_start?: string, zone?: 'FOH' | 'BOH' }
// Output: labor cost by day + position, OT breakdown, hours by zone
// Tables: schedules, shifts, shift_assignments, overtime_rules
// Cache: DYNAMIC (2 min)
```

#### `get_evaluation_status`
```typescript
// Input
{ employee_id?: string }
// Without employee_id: location-wide eval overview (upcoming, completed, by status)
// With employee_id: individual eval history + certification audit trail
// Tables: evaluations, certification_audit, employees
// Feature-gated: only available when enable_evaluations=true
// Cache: TEAM (5 min)
```

### Display Tools (keep as-is)
- `show_employee_list` — Ranked list card
- `show_employee_card` — Single employee card

---

## 6. Tool Description Improvements (Poka-Yoke)

Move usage rules from system prompt INTO tool descriptions. Example:

**Before (system prompt rule):**
> "NEVER call get_position_rankings more than once per request"

**After (in tool description):**
> "Rank employees for ONE specific position (e.g. 'Host'). Returns top/bottom performers with averages. For comparing multiple positions or overall team trends, use get_team_overview instead — it already includes position averages and top/bottom performers."

Apply this pattern to all tools — each description should clearly state when to use it AND when to use something else instead.

---

## 7. Error Handling

### Orchestrator Failure
If Opus fails (timeout, API error):
1. Log warning
2. Fall back to **legacy mode**: MiniMax with tool loop (current behavior)
3. Track `fallback: true` in usage log

This ensures the system never goes fully down — the old path remains as a safety net.

### Tool Execution Failure
1. Retry once after 500ms for transient errors (5xx, timeout)
2. If still fails, include error in ToolResult
3. Worker receives partial data and generates best-effort response
4. Worker prompt includes: "If a tool returned an error, acknowledge the gap briefly and answer with available data."

### Worker Failure
If MiniMax fails:
1. Retry once with same input
2. If still fails, return fallback message: "I'm having trouble right now. Please try again."

---

## 8. Usage Tracking

### Updated `levi_usage_log` Schema
Add columns:
```sql
orchestrator_model TEXT,           -- e.g. 'anthropic/claude-opus-4.6'
orchestrator_input_tokens INTEGER,
orchestrator_output_tokens INTEGER,
orchestrator_cost_usd NUMERIC,
worker_model TEXT,                 -- e.g. 'minimax/minimax-m2.5'
worker_input_tokens INTEGER,
worker_output_tokens INTEGER,
worker_cost_usd NUMERIC,
tool_count INTEGER,                -- number of tools executed
tool_duration_ms INTEGER,          -- total tool execution time
fallback BOOLEAN DEFAULT false,    -- true if legacy mode was used
```

Existing columns (`model`, `input_tokens`, `output_tokens`, `cost_usd`) become totals (orchestrator + worker combined) for backward compatibility.

---

## 9. Files to Modify

| File | Change |
|------|--------|
| `src/lib/ai-provider.ts` | Add `orchestrator: openrouter('anthropic/claude-opus-4.6')` model |
| `src/lib/orchestrator.ts` | **NEW** — Orchestrator logic, plan generation, conversation summarizer |
| `src/lib/worker.ts` | **NEW** — Worker synthesis, display tool handling |
| `src/lib/tool-executor.ts` | **NEW** — Deterministic plan execution with retry |
| `src/lib/tool-registry.ts` | **NEW** — Tool registry (schemas + executors, replaces inline definitions) |
| `src/lib/prompts.ts` | Split into `orchestratorPrompt()` + `workerPrompt()`, keep `buildSystemPrompt()` for legacy fallback |
| `src/routes/ai/chat.ts` | Major refactor: new pipeline flow, keep legacy path as fallback |
| `src/tools/data/schedule.ts` | **NEW** — Schedule tools (3 tools) |
| `src/tools/data/evaluations.ts` | **NEW** — Evaluation tools (1 tool) |
| `src/tools/data/ratings.ts` | **DELETE** — Consolidated into profile |
| `src/tools/data/infractions.ts` | **DELETE** — Consolidated into profile |
| `src/tools/index.ts` | Update exports, add new tools, remove deleted ones |
| `src/lib/usage-tracker.ts` | Track orchestrator + worker costs separately |
| `supabase/migrations/YYYYMMDD_levi_usage_log_columns.sql` | Add new columns to usage log |

---

## 10. Verification Plan

1. **Unit test orchestrator output** — Verify plan schema is valid for various query types
2. **Integration test pipeline** — Full flow: message → plan → tools → response
3. **Legacy fallback test** — Simulate Opus failure, verify MiniMax fallback works
4. **Tool retry test** — Simulate Supabase timeout, verify retry behavior
5. **Scheduling tools** — Query real schedule data, verify correct shifts/costs returned
6. **Evaluation tools** — Query real evaluation data, verify cert status returned
7. **Cost verification** — Log orchestrator vs worker token counts, verify cost calculation
8. **Mobile app E2E** — Send messages from phone, verify SSE stream works identically
9. **Conversation persistence** — Verify messages save correctly with new metadata fields
