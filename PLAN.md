# Rich Chat UI & Agent Improvements Plan

## Problems Identified

1. **Internal "thinking" leaks into responses** — The LLM's internal reasoning (e.g., "Let me check if there's another way...") is shown as user-facing text. The system prompt doesn't tell the LLM to only output final responses.
2. **No structured UI elements** — Employee data, ratings, infractions are all rendered as plain markdown text. Should be tappable cards with structured data.
3. **Inefficient querying** — "Who's the best bagger?" caused 6+ individual `get_employee_ratings` calls. Should use a single bulk query tool instead.
4. **No way to display structured data** — The agent has no mechanism to tell the mobile app "render this as an employee card" or "render this as a rating card."

## Architecture Overview

The solution has 3 layers:

- **Layer 1: Agent** — New bulk tools + structured output annotations
- **Layer 2: SSE Protocol** — New event type for structured UI blocks
- **Layer 3: Mobile** — Rich card components rendered inline in chat

---

## Phase 1: Fix the System Prompt (Agent)

**File**: `apps/agent/src/lib/prompts.ts`

Add clear instructions to the system prompt:

```
Output rules:
- NEVER include internal reasoning, planning thoughts, or tool commentary in your response.
- NEVER say things like "Let me check...", "I should search for...", "Let me try..."
- Only output the FINAL answer. The tool call UI shows the user what you're doing.
- Your response should read as a polished answer, not a thought process.
```

Update style instructions to emphasize: "Only output the final answer. No preamble, no thinking aloud."

---

## Phase 2: New Bulk Query Tool — `get_position_rankings` (Agent)

**New File**: `apps/agent/src/tools/data/rankings.ts`

A new tool that efficiently answers "who's the best at X?" questions:

```typescript
get_position_rankings: tool({
  description: 'Get ranked employees by average rating for a specific position. Use for "who is the best bagger?", "top rated hosts", "ranking for iPOS".',
  inputSchema: z.object({
    position: z.string().describe('Position name (e.g., "Bagging", "iPOS", "Host")'),
    limit: z.number().optional().describe('Max results (default: 10)'),
    sort: z.enum(['best', 'worst']).optional().describe('Sort order (default: best)'),
  }),
})
```

**Implementation**: Query `daily_position_averages` table (JSONB `position_averages` per employee per day) joined with `employees` for name/role. Get most recent calculation date, rank by that position's average.

**Fallback**: If no `daily_position_averages` data, aggregate directly from `ratings` table using `AVG(rating_avg)` grouped by employee filtered by position.

Register in `apps/agent/src/routes/ai/chat.ts` alongside existing tools.

---

## Phase 3: Structured UI Blocks — Protocol Design

### Concept: "UI Blocks" emitted as custom SSE events

The agent emits structured JSON blocks as a **custom SSE event type** that the mobile app renders as rich UI components. These are injected server-side based on tool results — the LLM doesn't generate them.

**New SSE event**: `data-ui-block`

```typescript
{
  type: 'data-ui-block',
  data: {
    blockType: 'employee-card' | 'employee-list' | 'rating-summary' | 'infraction-card',
    blockId: string,
    payload: { ... }  // type-specific data
  }
}
```

### Block Types

**`employee-card`** — Single employee with key info, tappable.
```typescript
payload: {
  employee_id: string,
  name: string,
  role: string,
  hire_date?: string,
  certified_status?: string,
  rating_avg?: number,
  rating_position?: string,
  active_points?: number,
  is_leader?: boolean,
  is_trainer?: boolean,
}
```

**`employee-list`** — Ranked/filtered list of employees.
```typescript
payload: {
  title?: string,  // e.g., "Top Baggers"
  employees: Array<{
    employee_id: string,
    name: string,
    role: string,
    rank?: number,
    metric_label?: string,  // e.g., "Bagging Avg"
    metric_value?: number,
  }>
}
```

**`rating-summary`** — Rating breakdown for an employee.
```typescript
payload: {
  employee_id: string,
  employee_name: string,
  position: string,
  rating_avg: number,
  rating_count: number,
  trend?: 'improving' | 'declining' | 'stable',
}
```

**`infraction-card`** — An infraction incident.
```typescript
payload: {
  id: string,
  employee_name: string,
  infraction: string,
  date: string,
  points: number,
  leader_name?: string,
}
```

### How blocks are injected (server-side)

In `apps/agent/src/routes/ai/chat.ts`, during `onStepFinish`:
1. After each tool result, parse the tool output JSON
2. Based on tool name + data shape, create UI blocks
3. Emit as `data-ui-block` SSE events via `writer.write()`

**System prompt addition**: "When tool results include employee data, visual cards are displayed automatically to the user. Don't repeat that data verbatim in text — reference it briefly instead."

---

## Phase 4: Mobile — Rich Card Components

### New Components (`apps/mobile/src/components/levi/cards/`)

- **`EmployeeCard.tsx`** — Glass card with avatar, name, role, optional rating/points badges. Tappable.
- **`EmployeeListCard.tsx`** — Titled card with numbered employee rows + metric values.
- **`RatingSummaryCard.tsx`** — Position name, average rating with color indicator, trend arrow.
- **`InfractionCard.tsx`** — Infraction type, date, points badge, leader name.
- **`UIBlockRenderer.tsx`** — Dispatcher that routes blockType to the correct card component.

### ChatBubble Updates

Add `uiBlocks` array to `ChatMessage` interface. Render between tool call summary and markdown:

```tsx
{hasToolCalls && <ToolCallSummary ... />}
{message.uiBlocks?.map(block => <UIBlockRenderer key={block.blockId} block={block} />)}
{hasContent && <Markdown ... />}
```

### LeviChatContext Updates

- Add `UIBlock` and `uiBlocks` to `ChatMessage` interface
- Handle `data-ui-block` events in `parseSSELine` — append to assistant message's uiBlocks array
- Trigger re-render on each block received

### Navigation from Cards

Tapping employee cards will be a no-op with haptic feedback for now. Future: navigate to Staff tab → employee profile.

---

## Phase 5: Tool Result → UI Block Mapping

**New File**: `apps/agent/src/lib/ui-blocks.ts`

Functions that transform tool results into UI block events:

```typescript
export function toolResultToUIBlocks(toolName, toolInput, toolOutput): UIBlock[]
```

Mapping per tool:
- `lookup_employee` → `employee-card` per result
- `list_employees` → `employee-list` with all employees
- `get_employee_ratings` → `rating-summary`
- `get_employee_infractions` → `infraction-card` per infraction
- `get_employee_profile` → `employee-card` + `rating-summary` + `infraction-card`s
- `get_position_rankings` → `employee-list` with rankings
- `get_team_overview` → `employee-list` for attention items
- `get_discipline_summary` → `infraction-card`s

---

## Implementation Order

1. **Phase 1**: Fix system prompt — immediate quality improvement
2. **Phase 2**: New `get_position_rankings` tool — fixes inefficient querying
3. **Phase 3 + 5**: UI block protocol + server-side mapping — core infrastructure
4. **Phase 4**: Mobile card components + ChatBubble/Context updates — visual payoff

## Files Changed

### Agent (`apps/agent/`)
- `src/lib/prompts.ts` — updated system prompt
- `src/tools/data/rankings.ts` — NEW: bulk position ranking tool
- `src/routes/ai/chat.ts` — register new tool, emit UI blocks in onStepFinish
- `src/lib/ui-blocks.ts` — NEW: tool result → UI block mapper

### Mobile (`apps/mobile/`)
- `src/context/LeviChatContext.tsx` — handle `data-ui-block` events, add uiBlocks to ChatMessage
- `src/components/levi/ChatBubble.tsx` — render UI blocks inline
- `src/components/levi/cards/EmployeeCard.tsx` — NEW
- `src/components/levi/cards/EmployeeListCard.tsx` — NEW
- `src/components/levi/cards/RatingSummaryCard.tsx` — NEW
- `src/components/levi/cards/InfractionCard.tsx` — NEW
- `src/components/levi/cards/UIBlockRenderer.tsx` — NEW
- `src/components/levi/cards/index.ts` — NEW barrel export
