# Levi Single-Model Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Levi's three-phase orchestrator-worker pipeline with a single Claude Sonnet 4.6 agent using native tool calling and adaptive thinking.

**Architecture:** Single `streamText` call to Sonnet 4.6 with all tools (data + display), adaptive thinking via OpenRouter, SSE tool-status interception via `onStepFinish`, code-level fallback to Opus 4.6.

**Tech Stack:** Hono.js, Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`), OpenRouter, Zod, TypeScript (strict: true)

**Spec:** `docs/superpowers/specs/2025-03-25-levi-single-model-agent-design.md`

**Note on testing:** The agent project has no test suite. Verification is via `pnpm typecheck` and manual testing against the mobile app. Each task ends with a typecheck step.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/agent/src/lib/ai-provider.ts` | Modify | Model aliases — primary (Sonnet 4.6), escalation (Opus 4.6) |
| `apps/agent/src/lib/prompts.ts` | Rewrite | Single XML-structured system prompt for Claude 4.6 |
| `apps/agent/src/lib/tool-registry.ts` | Modify | Consolidate to `buildTools()`, enhance tool descriptions, remove dead code |
| `apps/agent/src/lib/usage-tracker.ts` | Modify | Remove pipeline fields, update pricing table |
| `apps/agent/src/routes/ai/chat.ts` | Rewrite | Single `streamText` path replacing pipeline + legacy + escalation |
| `apps/agent/src/lib/orchestrator.ts` | Delete | Replaced by native tool calling |
| `apps/agent/src/lib/worker.ts` | Delete | Replaced by single model synthesis |
| `apps/agent/src/lib/tool-executor.ts` | Delete | Replaced by AI SDK tool loop |

---

### Task 1: Update Model Aliases

**Files:**
- Modify: `apps/agent/src/lib/ai-provider.ts`

- [ ] **Step 1: Replace model aliases**

Replace the entire `models` export and remove unused style instructions that were worker-specific:

```typescript
/**
 * AI Provider — OpenRouter via Vercel AI SDK.
 *
 * Model aliases:
 *   primary    → Sonnet 4.6 (single agent — tool calling + synthesis)
 *   escalation → Opus 4.6 (fallback on primary failure)
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider } from 'ai';

const openrouter = createOpenAICompatible({
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://levelset.io',
    'X-Title': 'Levelset Levi',
  },
});

/**
 * Named model aliases for Levi.
 *
 * Usage:
 *   import { models } from './ai-provider.js';
 *   const model = models.languageModel('primary');
 */
export const models = customProvider({
  languageModels: {
    primary: openrouter('anthropic/claude-sonnet-4-6'),
    escalation: openrouter('anthropic/claude-opus-4-6'),
  },
});

/** Style instructions for the system prompt */
export const STYLE_INSTRUCTIONS: Record<string, string> = {
  concise:
    'Be concise. Prefer 1-3 sentence responses. Use bullet points for lists. Never repeat the question back. Only output the final answer — no preamble or thinking aloud.',
  brief: 'Be extremely brief. One sentence max. No preamble. Only the final answer.',
  structured:
    'Use structured output. Bullet points, headers where appropriate. No filler text. Only output the final answer.',
};

/** Get style instruction string to inject into system prompt */
export function getStyleInstruction(style: string): string {
  return STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.concise;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/agent && npx tsc --noEmit`

Expected: Errors in files that import `orchestrator`, `worker`, `tool-executor`, or reference removed model aliases (`orchestrator`, `batch`). These will be fixed in later tasks. The ai-provider.ts file itself should have no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/lib/ai-provider.ts
git commit -m "refactor(agent): update model aliases to Sonnet 4.6 primary, Opus 4.6 escalation"
```

---

### Task 2: Rewrite System Prompt

**Files:**
- Rewrite: `apps/agent/src/lib/prompts.ts`

- [ ] **Step 1: Replace prompts.ts with XML-structured system prompt**

Replace the entire file. The new prompt follows Claude 4.6 best practices: XML structure, softened language, motivations instead of commands, no tool micro-management.

```typescript
/**
 * System prompt builder for Levi.
 *
 * Single XML-structured prompt for Claude Sonnet 4.6:
 *   <identity>    — who Levi is
 *   <style>       — response style (concise/brief/structured)
 *   <output_rules> — how to format responses, display tool guidance
 *   <tool_guidance> — high-level tool selection hints
 *   <domain_knowledge> — Tier 1 core context
 *   <org_context>  — roles, positions, thresholds, rubrics, pillars
 *   <relevant_context> — Tier 2+3 query-specific chunks
 *   <session>      — user name, date, feature awareness
 *
 * Total target: ~1200-1800 tokens.
 */

import { getStyleInstruction } from './ai-provider.js';
import type { OrgContext } from './org-context.js';

/**
 * Format org context into prompt-ready text.
 * Unchanged from previous implementation — token-efficient org summary.
 */
function formatOrgContext(ctx: OrgContext): string {
  const parts: string[] = [];

  const locLabel = ctx.locationNumber
    ? `${ctx.locationName} (#${ctx.locationNumber})`
    : ctx.locationName;
  parts.push(`Location: ${locLabel} — ${ctx.employeeCount} active employees`);

  if (ctx.roles.length > 0) {
    const roleNames = ctx.roles.map((r) => {
      if (r.hierarchy_level === 0) return `${r.role_name} (Operator, level 0)`;
      return r.role_name;
    }).join(' → ');
    const leaderNames = ctx.roles.filter((r) => r.is_leader).map((r) => r.role_name).join(', ');
    const operatorRole = ctx.roles.find((r) => r.hierarchy_level === 0);
    parts.push(`Roles (high→low): ${roleNames}`);
    if (operatorRole) {
      parts.push(`Operator role: "${operatorRole.role_name}" — use this to filter when asked "who is the operator"`);
    }
    if (leaderNames) {
      parts.push(`Leaders: ${leaderNames}`);
    }
  }

  if (ctx.positions.length > 0) {
    const byZone: Record<string, string[]> = {};
    for (const p of ctx.positions) {
      const zone = p.zone || 'General';
      if (!byZone[zone]) byZone[zone] = [];
      byZone[zone].push(p.name);
    }
    for (const [zone, names] of Object.entries(byZone)) {
      parts.push(`Positions (${zone}): ${names.join(', ')}`);
    }
  }

  if (ctx.ratingThresholds) {
    parts.push(
      `Rating Scale: 1-3 per criteria (5 criteria per position). Green ≥ ${ctx.ratingThresholds.green}, Yellow ≥ ${ctx.ratingThresholds.yellow}, Red < ${ctx.ratingThresholds.yellow}`
    );
  }

  if (ctx.infractionRubric.length > 0) {
    const items = ctx.infractionRubric.map((r) => `${r.action} (${r.points}pts)`).join(', ');
    parts.push(`Infraction Types: ${items}`);
  }

  if (ctx.disciplineRubric.length > 0) {
    const items = ctx.disciplineRubric.map((r) => `${r.action} (${r.points_threshold}pts)`).join(' → ');
    parts.push(`Discipline Escalation: ${items}`);
  }

  if (ctx.pillars && ctx.pillars.length > 0) {
    const pillarList = ctx.pillars.map((p) => `${p.name} (${p.weight}%)`).join(', ');
    parts.push(`OE Pillars: ${pillarList}`);
  }

  const featureFlags: string[] = [];
  if (ctx.features.certifications) featureFlags.push('Certifications');
  if (ctx.features.evaluations) featureFlags.push('Evaluations');
  if (ctx.features.pip) featureFlags.push('PIP');
  if (ctx.features.customRoles) featureFlags.push('Custom Roles');
  if (featureFlags.length > 0) {
    parts.push(`Active Features: ${featureFlags.join(', ')}`);
  }

  return parts.join('\n');
}

export function buildSystemPrompt(params: {
  userName: string;
  style: string;
  orgContext?: OrgContext;
  coreContext?: string;
  retrievedContext?: string;
}): string {
  const today = new Date().toISOString().split('T')[0];
  const styleInstruction = getStyleInstruction(params.style);

  const sections: string[] = [];

  // Identity
  sections.push(`<identity>
You are Levi, an AI assistant powered by Levelset. You help restaurant managers and leaders manage their team — employees, ratings, discipline, scheduling, labor, and operational excellence.
Respond in the same language the user writes in (English or Spanish).
</identity>`);

  // Style
  sections.push(`<style>
${styleInstruction}
</style>`);

  // Output rules — explain WHY, not just what
  sections.push(`<output_rules>
The mobile app shows tool-loading indicators to users while data is being fetched, so your text response should contain only the final polished analysis — no narration of tool calls, data fetching, or what tools returned.

When a visual card adds genuine value (top performers, employee lookup, a ranked list), call show_employee_list or show_employee_card. For analytical questions ("who should I promote?", "what trends?"), text analysis is usually clearer than cards. If you show a card, add insight beyond what the card displays — don't repeat the same data in text.

Formatting:
- Use standard markdown. **Bold** only for employee names and key numbers.
- Use bullet points and line breaks for longer responses.
- For multi-faceted questions, lead with your clear opinionated answer, then briefly explain reasoning.
- Only include hire dates, contact info, or metadata when explicitly requested.
- For ratings, show the average and note trends if relevant.
- For infractions, show current points (within the 90-day discipline cutoff) and recent incidents. Use "current points" for points within the cutoff and "archived points" for older ones.
</output_rules>`);

  // Tool guidance — high-level only, detail lives in tool descriptions
  sections.push(`<tool_guidance>
Most questions need 1-2 tool calls. Use lookup_employee first when you need to find an employee_id for other tools.
</tool_guidance>`);

  // Domain knowledge (Tier 1)
  if (params.coreContext) {
    sections.push(`<domain_knowledge>
${params.coreContext}
</domain_knowledge>`);
  }

  // Org context
  if (params.orgContext) {
    sections.push(`<org_context>
${formatOrgContext(params.orgContext)}
</org_context>`);
  }

  // Retrieved context (Tier 2+3)
  if (params.retrievedContext) {
    sections.push(`<relevant_context>
${params.retrievedContext}
</relevant_context>`);
  }

  // Session
  sections.push(`<session>
User: ${params.userName}. Date: ${today}.
Only reference features listed in Active Features above. If a feature is not listed, do not mention it or analyze data related to it.
The Owner/Operator (hierarchy_level 0) is the highest rank — exactly one per organization.
</session>`);

  return sections.join('\n\n');
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/agent && npx tsc --noEmit`

Expected: `prompts.ts` should compile cleanly. Same errors from other files referencing deleted modules.

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/lib/prompts.ts
git commit -m "refactor(agent): rewrite system prompt with XML structure for Claude 4.6"
```

---

### Task 3: Consolidate Tool Registry and Enhance Descriptions

**Files:**
- Modify: `apps/agent/src/lib/tool-registry.ts`

This is the largest single-file change. We rename `buildAllTools` → `buildTools`, remove `buildDisplayTools`, `getToolSummaries`, and `TOOL_META`, and enhance tool descriptions with selection guidance previously in the system prompt.

- [ ] **Step 1: Remove TOOL_META, getToolSummaries, and buildDisplayTools**

Delete the `TOOL_META` constant (lines 65-144), the `getToolSummaries` function (lines 152-171), and the standalone `buildDisplayTools` function (lines 288-351).

- [ ] **Step 2: Rename buildAllTools to buildTools and enhance descriptions**

Rename the function and update tool descriptions. The key changes to descriptions:

```typescript
// ─── Tool Builder ────────────────────────────────────────────────────────────

/**
 * Build all tools for Levi. Used by the single-model agent.
 * Feature gating preserved — org chart and evaluations are conditional.
 */
export function buildTools(ctx: ToolRegistryContext): ToolSet {
  const { orgId, locationId, features } = ctx;

  const tools: ToolSet = {
    lookup_employee: tool({
      description:
        'Search for an employee by name and return their basic details (role, hire date, leader/trainer status). Call this first when you need an employee_id for other tools like get_employee_profile or get_employee_schedule.',
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
    get_employee_profile: tool({
      description:
        'Get a comprehensive profile for ONE employee: details, recent ratings with trend, infractions, and discipline actions — all in one call. Requires employee_id (use lookup_employee first). No need to call separate ratings or discipline tools after this.',
      inputSchema: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getEmployeeProfile(input, orgId, locationId);
      },
    }),
    get_team_overview: tool({
      description:
        'Primary tool for broad team, rating, and performance questions. Returns role breakdown, position rating averages with trends, top/bottom performers, discipline attention items, and recent hires — all in one call. Use this for "how is the team doing?", "what trends?", "who are the top performers?" and similar broad questions.',
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
        'Discipline deep dive. With employee_id: detailed discipline history (infractions, actions, pending recommendations). Without employee_id: location-wide overview (top point holders, infraction breakdown, recent actions). Use this for discipline-specific questions — not for ratings.',
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
        'Rank employees for a SINGLE specific position by rating average (e.g. "who is the best host?", "rank the baggers"). Only for single-position ranking questions. For general team ratings, trends, or overall performance, use get_team_overview instead.',
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
    get_pillar_scores: tool({
      description:
        'OE pillar scores (0-100) for Operational Excellence / WHED strategy questions. Without employee_id: location-level scores + top/bottom performers per pillar. With employee_id: per-pillar scores with position breakdown. NOT for general ratings — use get_team_overview for that.',
      inputSchema: z.object({
        employee_id: z.string().optional().describe('UUID of a specific employee. Omit for location-wide scores.'),
        pillar: z.string().optional().describe('Filter to specific pillar name (e.g. "Great Food")'),
        days: z.number().optional().describe('Lookback period in days (default: 30)'),
        start_date: z.string().optional().describe('Explicit start date YYYY-MM-DD (overrides days)'),
        end_date: z.string().optional().describe('Explicit end date YYYY-MM-DD (default: today)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getPillarScores(input, orgId, locationId);
      },
    }),

    get_rating_activity: tool({
      description:
        'Flexible ratings query tool for rating activity, submission patterns, and detailed rating data. Supports multiple modes:\n' +
        '- group_by "rater": Who submitted the most/fewest ratings?\n' +
        '- group_by "employee": Who received the most/fewest ratings?\n' +
        '- group_by "position": Which positions got rated the most?\n' +
        '- group_by "day": How many ratings per day?\n' +
        '- No group_by: Individual ratings with per-criteria scores and notes\n\n' +
        'The rater is the leader/trainer who submitted. The employee is the team member rated.\n' +
        'Default date range is last 7 days. Use start_date/end_date for custom ranges.',
      inputSchema: z.object({
        group_by: z
          .enum(['rater', 'employee', 'position', 'day'])
          .optional()
          .describe('Group results by dimension. Omit for individual ratings.'),
        rater_id: z.string().optional().describe('Filter to ratings submitted by this employee_id (the rater).'),
        employee_id: z.string().optional().describe('Filter to ratings received by this employee_id.'),
        position: z.string().optional().describe('Filter to a specific position name (case-insensitive)'),
        start_date: z.string().optional().describe('Start date YYYY-MM-DD (default: 7 days ago)'),
        end_date: z.string().optional().describe('End date YYYY-MM-DD (default: today)'),
        limit: z.number().optional().describe('Max results (default: 20, max: 50)'),
        sort: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc = highest/newest first)'),
        include_criteria: z.boolean().optional().describe('Include position-specific criteria names (default: false)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getRatingActivity(input, orgId, locationId);
      },
    }),

    // Conditional tools — org chart
    ...(features?.orgChart
      ? {
          get_org_chart: tool({
            description:
              'Org chart tree: departments, groups, supervisors, and direct reports. For "who reports to whom?" and hierarchy questions.',
            inputSchema: z.object({}),
            execute: async () => {
              return await getOrgChart({}, orgId, locationId);
            },
          }),
        }
      : {}),

    // Schedule tools
    get_schedule_overview: tool({
      description:
        'Week schedule status: shift counts, assigned/unassigned, total hours, daily coverage. For "how does the schedule look?" or "are we fully staffed?"',
      inputSchema: z.object({
        week_start: z.string().optional().describe('Start of week (YYYY-MM-DD, defaults to current Monday)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getScheduleOverview(input, orgId, locationId);
      },
    }),
    get_employee_schedule: tool({
      description:
        'Upcoming shifts for ONE specific employee. Requires employee_id (use lookup_employee first).',
      inputSchema: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
        weeks: z.number().optional().describe('Number of weeks to look ahead (default: 2)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getEmployeeSchedule(input, orgId, locationId);
      },
    }),
    get_labor_summary: tool({
      description:
        'Labor cost breakdown for a week: total hours, total cost, FOH/BOH split, overtime alerts. For "what are labor costs?" or "who is in overtime?"',
      inputSchema: z.object({
        week_start: z.string().optional().describe('Start of week (YYYY-MM-DD, defaults to current Monday)'),
        zone: z.enum(['FOH', 'BOH']).optional().describe('Filter to front-of-house or back-of-house only'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getLaborSummary(input, orgId, locationId);
      },
    }),

    // Conditional tools — evaluations
    ...(features?.evaluations
      ? {
          get_evaluation_status: tool({
            description:
              'Evaluation status. Without employee_id: location-wide overview (upcoming, completed, by status). With employee_id: individual evaluation history.',
            inputSchema: z.object({
              employee_id: z.string().optional().describe('Optional UUID. Omit for location-wide overview.'),
            }),
            execute: async (input: Record<string, unknown>) => {
              return await getEvaluationStatus(input, orgId, locationId);
            },
          }),
        }
      : {}),

    // Display tools
    show_employee_list: tool({
      description:
        'Display a visual ranked-list card in the chat. Only call when a visual list genuinely adds value — top performers, employees needing improvement, position rankings. Not every response needs a card. For analytical answers, text is usually clearer.',
      inputSchema: z.object({
        title: z.string().describe('Card title (e.g. "Top Performers", "Needs Improvement")'),
        employees: z.array(
          z.object({
            employee_id: z.string().optional().describe('Employee UUID if available'),
            name: z.string().describe('Employee full name'),
            role: z.string().optional().describe('Employee role'),
            metric_label: z.string().optional().describe('Label for the metric (e.g. "Avg Rating")'),
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
        'Display a visual card for a single employee. Only call when a visual card genuinely helps — after a lookup or when highlighting one specific employee.',
      inputSchema: z.object({
        employee_id: z.string().optional().describe('Employee UUID if available'),
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

  return tools;
}
```

- [ ] **Step 3: Remove dead exports and update the file header**

At the top of the file, remove:
- The `ToolMeta` interface
- The `ToolCategory` type (`'data' | 'display' | 'action'` — only used by `ToolMeta`, safe to delete)
- Any imports that are no longer needed

Keep:
- `ToolRegistryContext` interface and type
- `executeTool()` function (used by tool execute callbacks)
- `getToolCallLabel()` function (used by chat route for SSE labels)
- All imports for tool implementations (`../tools/data/*`)

Update the file header comment:

```typescript
/**
 * Tool Registry — central registry for all Levi tools.
 *
 * Provides:
 *   buildTools(ctx)       — Build all tools for the agent (data + display)
 *   executeTool(name, args, ctx) — Execute a tool by name (used internally by tool callbacks)
 *   getToolCallLabel(name, input) — Human-readable labels for SSE status events
 */
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/agent && npx tsc --noEmit`

Expected: Errors in `chat.ts` (still imports old functions), `orchestrator.ts`, `worker.ts`. The `tool-registry.ts` file itself should compile cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/lib/tool-registry.ts
git commit -m "refactor(agent): consolidate tool registry, enhance descriptions for native tool calling"
```

---

### Task 4: Simplify Usage Tracker

**Files:**
- Modify: `apps/agent/src/lib/usage-tracker.ts`

- [ ] **Step 1: Update pricing table and simplify UsageLogParams**

In `usage-tracker.ts`, make these changes:

Update the pricing table:
```typescript
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4-6': { input: 5.0, output: 25.0 },
};
```

Remove these fields from `UsageLogParams`:
```typescript
// DELETE these lines from the interface:
orchestratorModel?: string;
orchestratorInputTokens?: number;
orchestratorOutputTokens?: number;
orchestratorCostUsd?: number;
workerModel?: string;
workerInputTokens?: number;
workerOutputTokens?: number;
workerCostUsd?: number;
fallback?: boolean;
```

Remove the orchestrator/worker cost calculation block from `logUsage()` — the lines that compute `orchestratorCost` and `workerCost`. Also remove those fields from the `.insert()` call.

- [ ] **Step 2: Typecheck**

Run: `cd apps/agent && npx tsc --noEmit`

Expected: Errors in `chat.ts` (still passes removed fields). The `usage-tracker.ts` itself should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/lib/usage-tracker.ts
git commit -m "refactor(agent): simplify usage tracker — remove pipeline fields, update pricing"
```

---

### Task 5: Rewrite Chat Route

**Files:**
- Rewrite: `apps/agent/src/routes/ai/chat.ts`

This is the core change. Replace the pipeline + legacy + escalation cascade with a single `streamText` call.

- [ ] **Step 1: Update imports**

Remove these imports:
```typescript
// DELETE:
import { generatePlan, summarizeConversation } from '../../lib/orchestrator.js';
import { executePlan } from '../../lib/tool-executor.js';
import type { ToolResult } from '../../lib/tool-executor.js';
import { synthesizeResponse } from '../../lib/worker.js';
import { buildAllTools, getToolCallLabel } from '../../lib/tool-registry.js';
```

Replace with:
```typescript
import { buildTools, getToolCallLabel } from '../../lib/tool-registry.js';
```

Keep `generateText` in the `ai` import — the non-streaming path still uses it.

- [ ] **Step 2: Rewrite the streaming path**

Replace everything inside `if (wantsStream) { ... }` (the section from the `const startMs` through the `return createUIMessageStreamResponse({ stream })`) with the new single-model path.

The code before the streaming section (steps 1-8: parse, auth, rate limit, parallel load, persist user message, load history, build system prompt, build registry context) stays exactly the same.

Replace the streaming section with:

```typescript
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

          const runAgent = (model: ReturnType<typeof models.languageModel>, isEscalation = false) => {
            return streamText({
              model,
              system: systemPrompt,
              messages: llmMessages,
              tools: leviTools,
              stopWhen: stepCountIs(MAX_TOOL_STEPS),
              // Enable adaptive thinking via OpenRouter reasoning passthrough.
              // If @ai-sdk/openai-compatible doesn't pass providerOptions through,
              // move these to extraBody on the openrouter provider in ai-provider.ts.
              providerOptions: {
                openrouter: {
                  reasoning: { enabled: true },
                  verbosity: 'medium',
                },
              },
              experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' }),
              onStepFinish: async (step) => {
                // Track usage from each step
                if (step.usage) {
                  totalInputTokens += step.usage.inputTokens ?? 0;
                  totalOutputTokens += step.usage.outputTokens ?? 0;
                }

                // Emit tool-status labels for data tools
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

                      const isDisplay = typeof output === 'object' && output !== null && (output as any).__display;

                      if (isDisplay) {
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

            // Reset tracking
            totalInputTokens = 0;
            totalOutputTokens = 0;
            toolCallCount = 0;

            try {
              const fallbackResult = runAgent(models.languageModel('escalation'), true);

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
            toolCount: toolCallCount > 0 ? toolCallCount : undefined,
          }).catch(() => {});
        },
      });

      return createUIMessageStreamResponse({ stream });
    }
```

- [ ] **Step 3: Simplify the non-streaming path**

Replace the non-streaming section (after `// ── Non-streaming path`) with:

```typescript
    // ── Non-streaming path ──────────────────────────────────
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
      metadata: {
        model: finalModel,
        escalated,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
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
    }).catch((err) => {
      console.error('Usage logging failed:', err);
    });

    return c.json({ message: assistantContent });
```

- [ ] **Step 4: Verify imports are clean**

Ensure the import block at the top of `chat.ts` only imports what's needed. The final imports should be:

```typescript
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
import { getServiceClient } from '@levelset/supabase-client';
```

Removed imports: `generatePlan`, `summarizeConversation`, `executePlan`, `ToolResult`, `synthesizeResponse`, `buildAllTools`.

- [ ] **Step 5: Typecheck**

Run: `cd apps/agent && npx tsc --noEmit`

Expected: Should compile cleanly now. The only remaining errors should be from the files about to be deleted (orchestrator.ts, worker.ts, tool-executor.ts) if they import from each other — but since nothing imports them anymore, they should be ignored by tsc.

- [ ] **Step 6: Commit**

```bash
git add apps/agent/src/routes/ai/chat.ts
git commit -m "refactor(agent): replace pipeline with single Sonnet 4.6 agent"
```

---

### Task 6: Add Prompt Caching via OpenRouter

**Files:**
- Modify: `apps/agent/src/lib/prompts.ts`
- Possibly modify: `apps/agent/src/routes/ai/chat.ts` or `apps/agent/src/lib/ai-provider.ts`

The spec identifies prompt caching as a significant cost optimization — 90% savings on the cached portion of repeat requests in a conversation. OpenRouter passes `cache_control` through to Anthropic with provider sticky routing.

- [ ] **Step 1: Determine how to pass cache_control through the AI SDK**

The AI SDK's `streamText` accepts a `system` parameter as a string. To add `cache_control`, we may need to pass the system prompt as a content block array instead:

**Option A — System as content block array (preferred):**
```typescript
// In chat.ts, change the streamText call's system param:
system: [
  {
    type: 'text',
    text: systemPrompt,
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  },
],
```

**Option B — Top-level cache_control via extraBody:**
```typescript
// In ai-provider.ts, add to the openrouter provider:
const openrouter = createOpenAICompatible({
  // ...existing config
  extraBody: {
    cache_control: { type: 'ephemeral' },
  },
});
```

**Option C — If neither A nor B works**, skip prompt caching for now and file a follow-up. The architecture change still delivers cost savings without it.

Test by making two requests in the same conversation and checking the OpenRouter generation details for `cache_read_input_tokens > 0`.

- [ ] **Step 2: Verify cache hit**

Make two requests in the same conversation:
```bash
# Request 1 (cache write)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"message": "How is the team doing?", "location_id": "<loc>", "stream": false}'

# Request 2 (cache hit expected)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"message": "Who are the top performers?", "location_id": "<loc>", "stream": false}'
```

Check OpenRouter dashboard or generation details for cache metrics on request 2.

- [ ] **Step 3: Commit (if caching works)**

```bash
git add -A apps/agent/src/
git commit -m "feat(agent): add prompt caching via OpenRouter cache_control passthrough"
```

If caching can't be passed through the AI SDK, skip this task — the rest of the plan is not dependent on it.

---

### Task 7: Delete Old Pipeline Files

> Note: Tasks 7-9 were renumbered after inserting Task 6 (Prompt Caching).

**Files:**
- Delete: `apps/agent/src/lib/orchestrator.ts`
- Delete: `apps/agent/src/lib/worker.ts`
- Delete: `apps/agent/src/lib/tool-executor.ts`

- [ ] **Step 1: Delete the three files**

```bash
rm apps/agent/src/lib/orchestrator.ts
rm apps/agent/src/lib/worker.ts
rm apps/agent/src/lib/tool-executor.ts
```

- [ ] **Step 2: Full typecheck**

Run: `cd apps/agent && npx tsc --noEmit`

Expected: Clean compilation. No file should import these modules anymore.

- [ ] **Step 3: Commit**

```bash
git add -u apps/agent/src/lib/orchestrator.ts apps/agent/src/lib/worker.ts apps/agent/src/lib/tool-executor.ts
git commit -m "refactor(agent): delete orchestrator, worker, tool-executor — replaced by single-model agent"
```

---

### Task 7: Full Build Verification

- [ ] **Step 1: Full typecheck from monorepo root**

Run: `pnpm typecheck`

Expected: Clean. Dashboard and agent both pass.

- [ ] **Step 2: Build the agent**

Run: `cd apps/agent && npx tsc`

Expected: Clean build to `dist/`.

- [ ] **Step 3: Verify no dangling references**

Run: `grep -r "orchestrator\|tool-executor\|buildAllTools\|buildDisplayTools\|getToolSummaries\|TOOL_META\|minimax\|sonnet-4\.5\|sonnet-4-5\|gemini-2\.5" apps/agent/src/ --include="*.ts" -l`

Note: "worker" is excluded from the grep because `getToolCallLabel` legitimately references worker-related concepts. The pattern matches old model IDs with both dot and hyphen formats.

Expected: No files should match. If any do, they have stale references that need cleanup.

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A apps/agent/
git commit -m "chore(agent): clean up dangling references from pipeline removal"
```

---

### Task 8: Manual Testing

No automated test suite exists for the agent. Manual verification against the mobile app.

- [ ] **Step 1: Start agent locally**

```bash
cd apps/agent && pnpm dev
```

Verify: Server starts on port 3000, `GET /health` returns 200.

- [ ] **Step 2: Test basic chat (no tools)**

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"message": "Hi Levi"}'
```

Verify: Conversational response, no tool calls, no "Let me check..." phrasing.

- [ ] **Step 3: Test single-tool query (streaming)**

```bash
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"message": "How is the team doing?", "location_id": "<loc-id>", "stream": true}'
```

Verify:
- `data-tool-status` event appears for `get_team_overview`
- Text streams word-by-word
- Response is a polished analysis, not a data dump
- No forbidden phrases ("Let me check...", "Based on the data...")

- [ ] **Step 4: Test multi-tool query (lookup → profile)**

```bash
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"message": "Tell me about John", "location_id": "<loc-id>", "stream": true}'
```

Verify:
- Two `data-tool-status` events: one for `lookup_employee`, one for `get_employee_profile`
- Model chains the calls correctly (uses the employee_id from lookup in the profile call)
- A `data-ui-block` event may appear for `show_employee_card`

- [ ] **Step 5: Test display tool**

```bash
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"message": "Who are the top 5 performers?", "location_id": "<loc-id>", "stream": true}'
```

Verify:
- `data-ui-block` event with `blockType: "employee-list"` appears
- Text response adds analysis beyond the card data

- [ ] **Step 6: Test conversation persistence**

After the above tests, call the history endpoint:

```bash
curl http://localhost:3000/api/ai/chat/history \
  -H "Authorization: Bearer <your-jwt>"
```

Verify: Messages (user + assistant + tool) are persisted correctly.

- [ ] **Step 7: Commit any test-driven fixes, then tag**

```bash
git add -A apps/agent/
git commit -m "fix(agent): address issues found during manual testing"
```
