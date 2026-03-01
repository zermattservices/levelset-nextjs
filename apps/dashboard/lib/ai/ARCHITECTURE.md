# Levi - Levelset AI Architecture

> Last updated: March 2026

Levi is an AI assistant for restaurant managers built on an **Orchestrator-Worker** pipeline. A strong planner model (Claude Opus 4.6) creates a structured execution plan, a deterministic executor runs tools in parallel, and a fast worker model (MiniMax M2.5) synthesizes results into a streamed response.

---

## Design Principles

Guided by Anthropic's ["Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents):

1. **Start simple, add complexity only when measurable.** We started with a single-model tool loop. The orchestrator-worker split was added only after measuring tool selection quality problems with MiniMax handling planning + synthesis + tool calls together.

2. **Workflows over agents.** Levi uses the **orchestrator-worker** pattern — one of six workflow patterns Anthropic identifies. The orchestrator (Opus) plans deterministically, and the worker (MiniMax) synthesizes. We intentionally avoid the fully autonomous "agent" pattern (model-driven control loops) because our tool set is bounded and predictable.

3. **Tool design is the Agent-Computer Interface (ACI).** Tool descriptions receive the same attention as UI copy. Each description states when to use the tool AND when to use something else. We iterate descriptions based on observed model mistakes (poka-yoke principle).

4. **Transparency.** Planning steps and tool execution are surfaced to the user via SSE events. The mobile app shows what Levi is doing at each step.

5. **Use frameworks for convenience, understand the internals.** We use the Vercel AI SDK directly (`generateObject`, `streamText`, `tool`, `smoothStream`) rather than high-level agent frameworks. Every abstraction is understood.

---

## Pipeline Flow

```
User message
  │
  ├─ [parallel] Load org context (roles, positions, features, rubrics)
  ├─ [parallel] Retrieve context (3-tier: core summaries + pgvector + PageIndex)
  ├─ [parallel] Get/create conversation + load history
  │
  ▼
Orchestrator (Opus 4.6 via generateObject)
  Input: user message + conversation summary + org context + available tools
  Output: ExecutionPlan { steps[], synthesisDirective, responseStyle }
  │
  ▼
Tool Executor (deterministic — no LLM)
  Groups steps by dependency → runs independent steps in parallel
  Emits SSE data-tool-status events for each tool
  Retries transient failures once
  │
  ▼
Worker (MiniMax M2.5 via streamText + smoothStream)
  Input: tool results + synthesis directive + conversation history
  Has display tools only (show_employee_list, show_employee_card)
  Streams response via SSE (UI Message Stream Protocol)
  │
  ▼
Persist assistant message + log usage
```

**Fallback:** If the orchestrator fails (timeout, API error, invalid plan), the system falls back to the legacy single-model path where MiniMax handles everything in an iterative tool loop (max 5 steps).

---

## Tool System

### Tool Registry

All tools are registered in `apps/agent/src/lib/tool-registry.ts`. Each tool has:

- **Metadata** (`ToolMeta`): category, one-line summary for orchestrator, confirmation flag
- **Zod schema**: typed input validation
- **Executor function**: `(args, orgId, locationId?) → Promise<string>`

Tool categories:
| Category | Description | Called By |
|----------|-------------|-----------|
| `data` | Read-only queries (employees, ratings, org chart) | Tool Executor |
| `display` | UI cards (employee list, employee card) | Worker |
| `action` | Write operations (future — not yet implemented) | Tool Executor + confirmation |

### Current Tools

**Data tools** (orchestrator plans these):
- `lookup_employee` — Search employee by name
- `list_employees` — List with filters (role, zone, leader, trainer)
- `get_employee_profile` — One-shot profile (details + ratings + discipline)
- `get_team_overview` — Location-wide team snapshot
- `get_discipline_summary` — Discipline deep dive (location or individual)
- `get_position_rankings` — Rank employees for one position
- `get_pillar_scores` — OE pillar scores with position breakdowns
- `get_org_chart` — Org chart tree (departments, groups, supervisors, direct reports)
- `get_schedule_overview` — Week schedule status + coverage
- `get_employee_schedule` — Individual employee shifts
- `get_labor_summary` — Labor costs, hours, OT by zone
- `get_evaluation_status` — Evaluation overview or individual history

**Display tools** (worker calls these):
- `show_employee_list` — Visual ranked list card
- `show_employee_card` — Single employee card

### Creating New Tools

Every tool follows the same pattern (see `apps/agent/src/tools/data/team.ts` as reference):

```typescript
// 1. Public function — entry point with caching
export async function getMyTool(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const cacheKey = `mytool:${locationId ?? 'org'}`;
  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.TEAM, () =>
    _getMyTool(orgId, locationId, args)
  );
}

// 2. Internal function — uncached, runs the actual queries
async function _getMyTool(
  orgId: string,
  locationId: string | undefined,
  args: Record<string, unknown>
): Promise<string> {
  const supabase = getServiceClient();

  // Run parallel queries, all scoped by org_id
  const [result1, result2] = await Promise.all([
    supabase.from('table1').select('...').eq('org_id', orgId),
    supabase.from('table2').select('...').eq('org_id', orgId),
  ]);

  // Return JSON string (even for errors)
  return JSON.stringify({ data: result1.data, summary: result2.data });
}
```

**Rules:**
- Function signature: `(args: Record<string, unknown>, orgId: string, locationId?: string) → Promise<string>`
- Always use `tenantCache.getOrFetch()` — never bypass the cache
- All queries scoped by `org_id` from auth context — never from user input
- Return `JSON.stringify()` — even errors (`{ error: "message" }`)
- Resolve UUIDs to human-readable names in the output — the LLM never sees raw IDs
- Feature-gate tools that depend on org configuration (e.g., org chart, evaluations)

### Cache TTL Guide

| TTL | Duration | Use For |
|-----|----------|---------|
| `ORG_CONFIG` | 10 min | Roles, positions, rubrics, features — rarely changes |
| `TEAM` | 5 min | Employee lists, team overview, org chart — changes infrequently |
| `PROFILE` | 5 min | Individual employee profiles |
| `DYNAMIC` | 2 min | Ratings, infractions, schedules — changes frequently |
| `CONTEXT` | 30 min | Core context summaries, document metadata |

### Tool Description Guide (ACI Design)

Tool descriptions are the primary interface between the LLM and our data. Invest time in them.

**Do:**
- State what the tool does AND when to use something else
- Include negative guidance: "Do NOT also call X after this"
- Describe the output shape so the model knows what data it will get
- Use poka-yoke: modify args to prevent common errors

**Example (good):**
```
Get a comprehensive profile for ONE employee: details, recent ratings with
trend, infractions, and discipline actions — all in one call. Requires
employee_id (use lookup_employee first). After calling this, do NOT also
call get_employee_ratings or get_employee_infractions.
```

**Example (bad):**
```
Get employee profile.
```

---

## Context System

### 3-Tier Context Retrieval

Every request retrieves context in parallel with org context loading:

| Tier | Source | Token Budget | Cache |
|------|--------|-------------|-------|
| **Tier 1 — Core Context** | `levi_core_context` table (condensed domain summaries) | ~700 tokens | 30 min |
| **Tier 2 — Semantic Chunks** | `context_chunks` via pgvector cosine similarity | ~300-800 tokens | Per-query |
| **Tier 3 — PageIndex Reasoning** | PageIndex API for document-level reasoning | ~200-500 tokens | Conditional |

Tier 1 is always present. Tier 2 activates on user queries. Tier 3 activates only when Tier 2 finds high-similarity chunks from documents with PageIndex tree IDs.

### Org Context (System Prompt Injection)

`loadOrgContext()` runs 9 parallel Supabase queries to load organization configuration:
- Role hierarchy (with operator role, leaders, trainers)
- Positions by zone with evaluation criteria
- Feature toggles (certifications, evaluations, PIP, custom roles, org chart)
- Rating thresholds (green/yellow/red)
- Infraction rubric (action → points)
- Discipline rubric (action → points threshold for escalation)
- Location info (name, number)
- Active employee count
- OE pillars (name, weight, display order)

Results are formatted into ~200-400 tokens and injected into the system prompt so the LLM can answer org-aware questions without tool calls.

### System Prompt Architecture

Five sections, total ~1400-2100 tokens:

| Section | Content | Tokens |
|---------|---------|--------|
| 1. Identity & Guidelines | Who Levi is, response style, tool usage rules, forbidden phrases | ~100 |
| 2. Core Domain Context | Tier 1 always-present summaries | ~700 |
| 3. Org Context | Formatted from OrgContext: roles, positions, thresholds, rubrics | ~200-400 |
| 4. Retrieved Context | Tier 2+3 query-specific chunks + PageIndex reasoning | ~300-800 |
| 5. User & Session | User name, date, language preference | ~30 |

The orchestrator gets a compressed version (~400 tokens total) focused on available tools and org configuration. The worker gets the full prompt minus tool selection rules (it doesn't select tools).

---

## Caching Strategy

The agent runs as a long-lived Fly.io process with an in-memory `TenantCache`:

- **Org-scoped**: `Map<orgId, Map<cacheKey, CacheEntry>>`
- **TTL-based**: Each entry has a configurable expiry
- **Auto-cleanup**: Background interval every 5 minutes evicts expired entries
- **Scope-based invalidation**: API endpoint can invalidate by scope (`team`, `ratings`, `infractions`, `org_config`, `all`)
- **Hit rate tracking**: Internal stats for monitoring cache effectiveness

Pattern: `tenantCache.getOrFetch(orgId, key, ttl, fetcherFn)` — returns cached value or calls fetcher, caches result, and returns it.

---

## Error Handling & Fallback

| Failure | Response |
|---------|----------|
| Orchestrator timeout/error | Fall back to legacy single-model path (MiniMax with all tools) |
| Primary model (MiniMax) failure | Escalate to Claude Sonnet 4.5 |
| Individual tool failure | Include error in ToolResult — worker generates partial response |
| Transient tool error (5xx) | Retry once with 500ms delay |
| Rate limit exceeded | Return 429 with user-friendly message |
| Context retrieval failure | Proceed without context (non-fatal) |
| Org context load failure | Proceed without org context (non-fatal) |

---

## Action Tool Roadmap

All current tools are **read-only**. The architecture is designed for future **action tools** (write operations) without restructuring.

### How Action Tools Will Work

1. **Tool Registry**: Action tools have `category: 'action'` and `requiresConfirmation: true`
2. **Orchestrator**: Sets `requiresConfirmation: true` on plan steps involving action tools
3. **Tool Executor**: When a step has `requiresConfirmation: true`:
   - Pauses execution
   - Emits SSE confirmation event to mobile app
   - Waits for user to confirm or cancel
   - Proceeds or skips based on response
4. **Permissions**: Action tools check the user's permission profile before execution (e.g., `DISC_SUBMIT_INFRACTIONS` for recording an infraction)

### Candidate Action Tools

| Tool | Permission | Operation |
|------|-----------|-----------|
| `record_infraction` | `DISC_SUBMIT_INFRACTIONS` | Record an infraction for an employee |
| `submit_rating` | `PE_SUBMIT_RATINGS` | Submit a position rating |
| `update_schedule` | Future permission | Modify shift assignments |
| `send_notification` | Future permission | Send a message to an employee |

### Implementation Requirements

- Add `userId` and `userPermissions` to `ToolRegistryContext`
- Implement `onConfirmationRequired` callback in the tool executor
- Add SSE event type for confirmation requests/responses
- Mobile app UI for confirmation dialogs during tool execution

---

## Cost Model

Per-request cost breakdown (typical):

| Component | Model | Input Tokens | Output Tokens | Cost |
|-----------|-------|-------------|--------------|------|
| Orchestrator | Opus 4.6 | ~800 | ~200 | ~$0.009 |
| Worker | MiniMax M2.5 | ~2000 | ~500 | ~$0.001 |
| **Total** | | | | **~$0.01** |

Model pricing (per million tokens):

| Model | Input | Output |
|-------|-------|--------|
| MiniMax M2.5 | $0.30 | $1.20 |
| Claude Opus 4.6 | $5.00 | $25.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Gemini 2.5 Flash | $0.30 | $2.50 |

Fallback to legacy single-model path costs ~$0.001 per request (MiniMax only). Escalation to Sonnet costs ~$0.03-0.05 per request.

---

## File Tree

```
apps/agent/src/
├── index.ts                       # Hono server setup, CORS, routing
├── middleware/
│   └── auth.ts                    # JWT verification via Supabase, role checks
├── lib/
│   ├── ai-provider.ts             # OpenRouter model aliases (primary, escalation, batch, orchestrator)
│   ├── orchestrator.ts            # Plan generation via Opus generateObject
│   ├── tool-executor.ts           # Deterministic plan execution with parallel/sequential support
│   ├── tool-registry.ts           # Central tool registry (schemas, metadata, executors)
│   ├── worker.ts                  # Response synthesis via MiniMax streamText
│   ├── prompts.ts                 # System prompt builders (orchestrator, worker, legacy)
│   ├── org-context.ts             # Org context loader (9 parallel queries)
│   ├── context-retriever.ts       # 3-tier context retrieval (core + pgvector + PageIndex)
│   ├── embeddings.ts              # pgvector embedding generation + similarity search
│   ├── pageindex.ts               # PageIndex API client for document reasoning
│   ├── conversation-manager.ts    # Conversation CRUD + history pagination
│   ├── usage-tracker.ts           # Usage logging + rate limiting + cost calculation
│   ├── tenant-cache.ts            # Org-scoped in-memory cache with TTL
│   └── types.ts                   # ChatMessage, UserContext, ToolDefinition
├── tools/
│   └── data/
│       ├── employee.ts            # lookup_employee, list_employees
│       ├── profile.ts             # get_employee_profile (ratings + discipline in one call)
│       ├── team.ts                # get_team_overview
│       ├── discipline.ts          # get_discipline_summary
│       ├── rankings.ts            # get_position_rankings
│       ├── pillars.ts             # get_pillar_scores (with position_breakdown)
│       ├── org-chart.ts           # get_org_chart (departments, groups, supervisors)
│       ├── schedule.ts            # get_schedule_overview, get_employee_schedule, get_labor_summary
│       └── evaluations.ts         # get_evaluation_status
└── routes/
    ├── health.ts                  # GET /health
    └── ai/
        └── chat.ts                # POST /api/ai/chat — pipeline coordinator
                                   # GET /api/ai/chat/history — paginated history
                                   # DELETE /api/ai/chat/clear — archive conversation
```

---

## Mobile App Integration

The mobile app (`apps/mobile/`) consumes the agent via SSE streaming:

- **SSE events**: `data-tool-status` (tool progress), text deltas (streamed response), `data-ui-block` (visual cards)
- **Chat context**: `LeviChatContext.tsx` handles SSE parsing, message state, conversation lifecycle
- **Tool call UI**: `ToolCallCard.tsx` shows spinner → checkmark for each tool execution
- **Display cards**: `ChatBubble.tsx` renders `employee-list` and `employee-card` blocks inline

The orchestrator-worker pipeline is transparent to the mobile app — it sees the same SSE events as before.
