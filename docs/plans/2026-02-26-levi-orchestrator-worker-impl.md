# Levi AI Agent: Orchestrator-Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Levi's single-model architecture to an Orchestrator (Opus 4.6) → Deterministic Tool Execution → Worker (MiniMax M2.5) pipeline, add scheduling/evaluation tools, consolidate redundant tools, and improve tool descriptions.

**Architecture:** Opus 4.6 receives a compressed context and outputs a structured JSON execution plan. A deterministic executor runs tools from the plan in parallel where possible. MiniMax M2.5 receives tool results and generates the streamed user response. Legacy single-model path remains as fallback.

**Tech Stack:** Hono.js, Vercel AI SDK (`generateObject`, `streamText`, `tool`, `smoothStream`), OpenRouter, Supabase, TypeScript (strict)

**Design Doc:** `docs/plans/2026-02-26-levi-orchestrator-worker-design.md`

---

## Task 1: Add Orchestrator Model to AI Provider

**Files:**
- Modify: `apps/agent/src/lib/ai-provider.ts`

**Step 1: Add Opus 4.6 model alias**

Add the orchestrator model to the models object in `ai-provider.ts`:

```typescript
// After the existing model definitions (primary, escalation, batch)
export const models = {
  primary: openrouter('minimax/minimax-m2.5'),
  escalation: openrouter('anthropic/claude-sonnet-4-5-20250514'),
  batch: openrouter('google/gemini-2.5-flash-preview'),
  orchestrator: openrouter('anthropic/claude-opus-4-0-20250514'),
};
```

Also add Opus pricing to `MODEL_PRICING` in `usage-tracker.ts` (done in Task 11), but note the constant name here for reference.

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS (no new type errors)

**Step 3: Commit**

```bash
git add apps/agent/src/lib/ai-provider.ts
git commit -m "feat(agent): add Opus 4.6 orchestrator model alias"
```

---

## Task 2: Create Tool Registry

Extract tool schemas and executors from inline `buildTools()` in `chat.ts` into a dedicated registry. This decouples tool definitions from the chat route and enables the orchestrator to reference tool schemas independently.

**Files:**
- Create: `apps/agent/src/lib/tool-registry.ts`

**Step 1: Create the tool registry file**

```typescript
/**
 * Tool Registry
 * Central registry for all Levi AI tools — schemas, executors, and metadata.
 * Decouples tool definitions from the chat route so the orchestrator can
 * reference available tools independently of the worker.
 */

import { z } from 'zod';
import { tool, type CoreTool } from 'ai';

// Import all tool executors
import { lookupEmployee } from '../tools/data/employee';
import { listEmployees } from '../tools/data/employee';
import { getEmployeeProfile } from '../tools/data/profile';
import { getTeamOverview } from '../tools/data/team';
import { getDisciplineSummary } from '../tools/data/discipline';
import { getPositionRankings } from '../tools/data/rankings';
import { getPillarScores } from '../tools/data/pillars';

// ── Types ──────────────────────────────────────────────────────────────

export interface ToolRegistryContext {
  orgId: string;
  locationId?: string;
  features?: {
    certifications: boolean;
    evaluations: boolean;
    pip: boolean;
    customRoles: boolean;
  };
}

export interface ToolMeta {
  name: string;
  description: string;     // One-line for orchestrator
  category: 'data' | 'display';
}

// ── One-Line Descriptions for Orchestrator ─────────────────────────────

export const TOOL_SUMMARIES: Record<string, string> = {
  lookup_employee: 'Search for an employee by name → returns IDs and basic details.',
  list_employees: 'List employees with filters (role, zone, leader/trainer status) — no ratings/discipline.',
  get_employee_profile: 'Comprehensive one-shot for ONE employee: details + ratings + trend + infractions + discipline actions.',
  get_team_overview: 'Location-wide snapshot: rating averages by position, top/bottom performers, discipline attention items, team structure.',
  get_discipline_summary: 'Discipline deep dive — with employee_id: individual history. Without: location-wide overview.',
  get_position_rankings: 'Rank employees for ONE specific position (e.g. "Host"). Use get_team_overview for multi-position or overall.',
  get_pillar_scores: 'OE pillar scores — with employee_id: per-pillar breakdown. Without: location-level + top/bottom.',
  get_schedule_overview: 'Current week schedule: shift count, coverage, total hours/cost, unassigned shifts.',
  get_employee_schedule: 'One employee\'s shifts for this + next week with times, positions, breaks.',
  get_labor_summary: 'Labor cost breakdown by day and position, overtime totals, hours by zone.',
  get_evaluation_status: 'Evaluation overview — with employee_id: individual eval history + cert audit. Without: location-wide eval status.',
};

// ── Build Data Tools ───────────────────────────────────────────────────

export function buildDataTools(ctx: ToolRegistryContext): Record<string, CoreTool> {
  const { orgId, locationId, features } = ctx;

  return {
    lookup_employee: tool({
      description:
        'Search for an employee by name and return their basic details (role, hire date, leader/trainer status). Use this to find an employee ID before calling other tools. For a full profile, call get_employee_profile after this.',
      parameters: z.object({
        name: z.string().describe('Full or partial name of the employee to search for'),
        role: z.string().optional().describe('Filter by role name (e.g. "Team Leader")'),
      }),
      execute: async ({ name, role }) => {
        return await lookupEmployee({ name, role }, orgId, locationId);
      },
    }),

    list_employees: tool({
      description:
        'List employees with optional filters. Use for counting or listing employees by role, zone (FOH/BOH), leaders, or trainers. Does NOT include ratings or discipline data — use get_team_overview for that.',
      parameters: z.object({
        active_only: z.boolean().optional().describe('Only return active employees (default: true)'),
        is_leader: z.boolean().optional().describe('Filter for leaders only'),
        is_boh: z.boolean().optional().describe('Filter for back-of-house employees'),
        is_foh: z.boolean().optional().describe('Filter for front-of-house employees'),
        is_trainer: z.boolean().optional().describe('Filter for trainers only'),
        role: z.string().optional().describe('Filter by role name'),
        limit: z.number().optional().describe('Maximum number of employees to return (default: 20, max: 50)'),
      }),
      execute: async (input) => {
        return await listEmployees(input, orgId, locationId);
      },
    }),

    get_employee_profile: tool({
      description:
        'Get a comprehensive profile for ONE employee: details, recent ratings with trend (improving/declining/stable), infractions with current + archived points, and discipline actions — all in one call. Requires employee_id (use lookup_employee first). This replaces separate get_employee_ratings and get_employee_infractions calls.',
      parameters: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
      }),
      execute: async (input) => {
        return await getEmployeeProfile(input, orgId, locationId);
      },
    }),

    get_team_overview: tool({
      description:
        'Get the full team overview: rating averages by position (with 30-day trend), top/bottom performers by rating, team structure (roles, zones, leaders, trainers), discipline attention items, and recent hires. This is the go-to tool for broad questions about the team, ratings trends, or "how is the team doing?". For a single position ranking, use get_position_rankings instead.',
      parameters: z.object({
        zone: z
          .enum(['FOH', 'BOH'])
          .optional()
          .describe('Filter to front-of-house or back-of-house employees only'),
      }),
      execute: async (input) => {
        return await getTeamOverview(input, orgId, locationId, {
          certificationsEnabled: features?.certifications ?? false,
        });
      },
    }),

    get_discipline_summary: tool({
      description:
        'Get discipline data. With employee_id: detailed discipline history (all infractions, actions, pending recommendations, current + archived points). Without employee_id: location-wide overview (top point holders, infraction type breakdown, recent actions). Use this for discipline-specific questions — not for ratings.',
      parameters: z.object({
        employee_id: z
          .string()
          .optional()
          .describe('Optional UUID of a specific employee. Omit for location-wide overview.'),
      }),
      execute: async (input) => {
        return await getDisciplineSummary(input, orgId, locationId);
      },
    }),

    get_position_rankings: tool({
      description:
        'Rank employees for ONE specific position the user explicitly named (e.g. "who is the best host?"). Returns top/bottom performers with averages. For comparing multiple positions or overall team trends, use get_team_overview instead — it already includes position averages and top/bottom performers. NEVER call this more than once per request.',
      parameters: z.object({
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
      execute: async (input) => {
        return await getPositionRankings(input, orgId, locationId);
      },
    }),

    get_pillar_scores: tool({
      description:
        'Get Operational Excellence pillar scores (Great Food, Quick & Accurate, Creating Moments, etc.). Without employee_id: location-level scores + top/bottom performers per pillar. With employee_id: per-pillar scores with position breakdown and criteria mapping. Use for OE-specific questions.',
      parameters: z.object({
        employee_id: z.string().optional().describe('UUID of a specific employee. Omit for location-wide scores.'),
        pillar: z.string().optional().describe('Filter to specific pillar name (e.g. "Great Food")'),
        days: z.number().optional().describe('Lookback period in days (default: 30)'),
        start_date: z.string().optional().describe('Explicit start date YYYY-MM-DD (overrides days)'),
        end_date: z.string().optional().describe('Explicit end date YYYY-MM-DD (default: today)'),
      }),
      execute: async (input) => {
        return await getPillarScores(input, orgId, locationId);
      },
    }),
  };
}

// ── Build Display Tools ────────────────────────────────────────────────
// These are used by the worker (MiniMax) only — the orchestrator never calls them.

export function buildDisplayTools(): Record<string, CoreTool> {
  return {
    show_employee_list: tool({
      description:
        'Display a visual ranked-list card in the chat. Use when highlighting a group of employees — top performers, employees needing improvement, position rankings, etc. Only call AFTER data has been fetched. Not every response needs a card — only use when the visual genuinely adds value.',
      parameters: z.object({
        title: z.string().describe('Card title (e.g. "Top Performers", "Needs Improvement")'),
        employees: z.array(
          z.object({
            employee_id: z.string().optional().describe('Employee UUID if available'),
            name: z.string().describe('Employee full name'),
            role: z.string().optional().describe('Employee role'),
            metric_label: z.string().optional().describe('Label for the metric (e.g. "Avg Rating", "Points")'),
            metric_value: z.number().optional().describe('Numeric value for the metric'),
          })
        ).describe('Employees to display (max 10)'),
      }),
      execute: async ({ title, employees }) => {
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
        'Display a visual card for a single employee. Use when looking up or highlighting one specific employee. Only call AFTER data has been fetched.',
      parameters: z.object({
        employee_id: z.string().optional().describe('Employee UUID if available'),
        name: z.string().describe('Employee full name'),
        role: z.string().optional().describe('Employee role'),
        rating_avg: z.number().optional().describe('Overall rating average if available'),
        current_points: z.number().optional().describe('Current discipline points if relevant'),
      }),
      execute: async (input) => {
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

// ── Tool Names Helper ──────────────────────────────────────────────────

/**
 * Returns available tool names for the orchestrator prompt,
 * filtered by org feature flags.
 */
export function getAvailableToolNames(features?: {
  evaluations?: boolean;
}): string[] {
  const base = [
    'lookup_employee',
    'list_employees',
    'get_employee_profile',
    'get_team_overview',
    'get_discipline_summary',
    'get_position_rankings',
    'get_pillar_scores',
    'get_schedule_overview',
    'get_employee_schedule',
    'get_labor_summary',
  ];

  if (features?.evaluations) {
    base.push('get_evaluation_status');
  }

  return base;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/lib/tool-registry.ts
git commit -m "feat(agent): create centralized tool registry with schemas and executors"
```

---

## Task 3: Create Schedule Tool Executors

Add three new read-only scheduling tools that query existing `schedules`, `shifts`, and `shift_assignments` tables.

**Files:**
- Create: `apps/agent/src/tools/data/schedule.ts`

**Step 1: Create the schedule tools file**

Reference queries from `apps/dashboard/pages/api/scheduling/schedules.ts` and `apps/dashboard/pages/api/native/forms/my-schedule.ts` for table structure.

```typescript
/**
 * Schedule Tools — read-only scheduling insights for Levi AI.
 *
 * Tables used:
 * - schedules (id, location_id, week_start, status, created_at)
 * - shifts (id, schedule_id, shift_date, start_time, end_time, break_minutes, notes, position_id)
 * - shift_assignments (id, shift_id, employee_id, assigned_by, projected_cost)
 * - employees (id, full_name, role, is_foh, is_boh, calculated_pay)
 * - org_positions (id, name, zone, display_order)
 */

import { createClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache';

// ── Helpers ────────────────────────────────────────────────────────────

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().split('T')[0];
}

function getNextWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 7);
  return d.toISOString().split('T')[0];
}

function parseTimeToHours(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

function shiftHours(start: string, end: string, breakMins: number): number {
  let hours = parseTimeToHours(end) - parseTimeToHours(start);
  if (hours < 0) hours += 24; // overnight
  return Math.max(0, hours - breakMins / 60);
}

// ── get_schedule_overview ──────────────────────────────────────────────

export async function getScheduleOverview(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
) {
  if (!locationId) {
    return { error: 'Schedule overview requires a location context.' };
  }

  const weekStart = (args.week_start as string) || getWeekStart(new Date());
  const cacheKey = `schedule_overview:${locationId}:${weekStart}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, async () => {
    const supabase = createClient();

    // 1. Get the schedule
    const { data: schedule, error: schedErr } = await supabase
      .from('schedules')
      .select('id, week_start, status')
      .eq('location_id', locationId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (schedErr) throw schedErr;
    if (!schedule) {
      return { week_start: weekStart, status: 'none', message: 'No schedule exists for this week.' };
    }

    // 2. Get shifts with assignments
    const { data: shifts, error: shiftErr } = await supabase
      .from('shifts')
      .select(`
        id, shift_date, start_time, end_time, break_minutes,
        position:org_positions(id, name, zone),
        assignment:shift_assignments(
          id, employee_id, projected_cost,
          employee:employees(id, full_name, role)
        )
      `)
      .eq('schedule_id', schedule.id)
      .order('shift_date')
      .order('start_time');

    if (shiftErr) throw shiftErr;

    const allShifts = shifts || [];
    let totalHours = 0;
    let totalCost = 0;
    let assignedCount = 0;
    let unassignedCount = 0;
    const dayBreakdown: Record<string, { shifts: number; hours: number }> = {};
    const positionBreakdown: Record<string, { shifts: number; hours: number }> = {};

    for (const s of allShifts as any[]) {
      const hours = shiftHours(s.start_time, s.end_time, s.break_minutes || 0);
      totalHours += hours;

      const hasAssignment = s.assignment && s.assignment.length > 0;
      if (hasAssignment) {
        assignedCount++;
        totalCost += s.assignment[0]?.projected_cost || 0;
      } else {
        unassignedCount++;
      }

      // Day breakdown
      const day = s.shift_date;
      if (!dayBreakdown[day]) dayBreakdown[day] = { shifts: 0, hours: 0 };
      dayBreakdown[day].shifts++;
      dayBreakdown[day].hours += hours;

      // Position breakdown
      const posName = s.position?.name || 'Unassigned';
      if (!positionBreakdown[posName]) positionBreakdown[posName] = { shifts: 0, hours: 0 };
      positionBreakdown[posName].shifts++;
      positionBreakdown[posName].hours += hours;
    }

    return {
      week_start: weekStart,
      status: schedule.status,
      total_shifts: allShifts.length,
      assigned_shifts: assignedCount,
      unassigned_shifts: unassignedCount,
      total_hours: Math.round(totalHours * 10) / 10,
      total_projected_cost: Math.round(totalCost * 100) / 100,
      by_day: Object.entries(dayBreakdown).map(([date, d]) => ({
        date,
        shifts: d.shifts,
        hours: Math.round(d.hours * 10) / 10,
      })),
      by_position: Object.entries(positionBreakdown)
        .sort((a, b) => b[1].hours - a[1].hours)
        .map(([name, d]) => ({
          position: name,
          shifts: d.shifts,
          hours: Math.round(d.hours * 10) / 10,
        })),
    };
  });
}

// ── get_employee_schedule ──────────────────────────────────────────────

export async function getEmployeeSchedule(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
) {
  const employeeId = args.employee_id as string;
  if (!employeeId) {
    return { error: 'employee_id is required.' };
  }
  if (!locationId) {
    return { error: 'Employee schedule requires a location context.' };
  }

  const weeks = Math.min((args.weeks as number) || 2, 4);
  const cacheKey = `employee_schedule:${locationId}:${employeeId}:${weeks}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, async () => {
    const supabase = createClient();
    const now = new Date();
    const thisWeekStart = getWeekStart(now);

    // Build week_start values for requested weeks
    const weekStarts: string[] = [];
    for (let i = 0; i < weeks; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + i * 7);
      weekStarts.push(d.toISOString().split('T')[0]);
    }

    // Get published schedules for these weeks
    const { data: schedules, error: schedErr } = await supabase
      .from('schedules')
      .select('id, week_start, status')
      .eq('location_id', locationId)
      .in('week_start', weekStarts)
      .eq('status', 'published');

    if (schedErr) throw schedErr;
    if (!schedules || schedules.length === 0) {
      return { employee_id: employeeId, weeks: [], message: 'No published schedules found.' };
    }

    const scheduleIds = schedules.map((s: any) => s.id);
    const scheduleMap = new Map(schedules.map((s: any) => [s.id, s.week_start]));

    // Get this employee's shifts
    const { data: shifts, error: shiftErr } = await supabase
      .from('shifts')
      .select(`
        id, schedule_id, shift_date, start_time, end_time, break_minutes, notes,
        position:org_positions(id, name)
      `)
      .in('schedule_id', scheduleIds)
      .eq('shift_assignments.employee_id', employeeId)
      .order('shift_date')
      .order('start_time');

    // Fallback: join through shift_assignments if the above filter doesn't work
    // (Supabase may need inner join syntax)
    let employeeShifts = shifts || [];
    if (employeeShifts.length === 0) {
      const { data: assignments } = await supabase
        .from('shift_assignments')
        .select('shift_id')
        .eq('employee_id', employeeId);

      if (assignments && assignments.length > 0) {
        const shiftIds = assignments.map((a: any) => a.shift_id);
        const { data: fallbackShifts } = await supabase
          .from('shifts')
          .select(`
            id, schedule_id, shift_date, start_time, end_time, break_minutes, notes,
            position:org_positions(id, name)
          `)
          .in('id', shiftIds)
          .in('schedule_id', scheduleIds)
          .order('shift_date')
          .order('start_time');

        employeeShifts = fallbackShifts || [];
      }
    }

    // Group by week
    const weekMap: Record<string, any[]> = {};
    for (const ws of weekStarts) weekMap[ws] = [];

    for (const s of employeeShifts as any[]) {
      const weekStart = scheduleMap.get(s.schedule_id);
      if (weekStart && weekMap[weekStart]) {
        weekMap[weekStart].push({
          shift_date: s.shift_date,
          start_time: s.start_time,
          end_time: s.end_time,
          break_minutes: s.break_minutes || 0,
          position: s.position?.name || null,
          hours: shiftHours(s.start_time, s.end_time, s.break_minutes || 0),
        });
      }
    }

    const result = weekStarts.map((ws) => ({
      week_start: ws,
      shifts: weekMap[ws] || [],
      total_hours: Math.round(
        (weekMap[ws] || []).reduce((sum: number, s: any) => sum + s.hours, 0) * 10
      ) / 10,
    }));

    return { employee_id: employeeId, weeks: result };
  });
}

// ── get_labor_summary ──────────────────────────────────────────────────

export async function getLaborSummary(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
) {
  if (!locationId) {
    return { error: 'Labor summary requires a location context.' };
  }

  const weekStart = (args.week_start as string) || getWeekStart(new Date());
  const zone = args.zone as string | undefined;
  const cacheKey = `labor_summary:${locationId}:${weekStart}:${zone || 'all'}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, async () => {
    const supabase = createClient();

    // Get the schedule
    const { data: schedule } = await supabase
      .from('schedules')
      .select('id')
      .eq('location_id', locationId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (!schedule) {
      return { week_start: weekStart, message: 'No schedule exists for this week.' };
    }

    // Get shifts with assignments and pay data
    let query = supabase
      .from('shifts')
      .select(`
        id, shift_date, start_time, end_time, break_minutes,
        position:org_positions(id, name, zone),
        assignment:shift_assignments(
          projected_cost,
          employee:employees(id, full_name, calculated_pay, actual_pay, actual_pay_type)
        )
      `)
      .eq('schedule_id', schedule.id)
      .order('shift_date');

    const { data: shifts, error: shiftErr } = await query;
    if (shiftErr) throw shiftErr;

    let allShifts = (shifts || []) as any[];

    // Filter by zone if specified
    if (zone) {
      allShifts = allShifts.filter((s: any) => s.position?.zone === zone);
    }

    // Calculate labor
    let totalHours = 0;
    let totalCost = 0;
    const byDay: Record<string, { hours: number; cost: number; shifts: number }> = {};
    const byPosition: Record<string, { hours: number; cost: number; employees: Set<string> }> = {};
    const employeeHours: Record<string, { name: string; hours: number }> = {};

    for (const s of allShifts) {
      const hours = shiftHours(s.start_time, s.end_time, s.break_minutes || 0);
      totalHours += hours;

      const assignment = s.assignment?.[0];
      const cost = assignment?.projected_cost || 0;
      totalCost += cost;

      // By day
      const day = s.shift_date;
      if (!byDay[day]) byDay[day] = { hours: 0, cost: 0, shifts: 0 };
      byDay[day].hours += hours;
      byDay[day].cost += cost;
      byDay[day].shifts++;

      // By position
      const posName = s.position?.name || 'Unassigned';
      if (!byPosition[posName]) byPosition[posName] = { hours: 0, cost: 0, employees: new Set() };
      byPosition[posName].hours += hours;
      byPosition[posName].cost += cost;
      if (assignment?.employee?.id) {
        byPosition[posName].employees.add(assignment.employee.id);
      }

      // Employee hours (for OT detection)
      if (assignment?.employee) {
        const empId = assignment.employee.id;
        if (!employeeHours[empId]) {
          employeeHours[empId] = { name: assignment.employee.full_name, hours: 0 };
        }
        employeeHours[empId].hours += hours;
      }
    }

    // Detect overtime (>40 hours/week)
    const overtimeEmployees = Object.entries(employeeHours)
      .filter(([, v]) => v.hours > 40)
      .map(([id, v]) => ({
        employee_id: id,
        name: v.name,
        total_hours: Math.round(v.hours * 10) / 10,
        overtime_hours: Math.round((v.hours - 40) * 10) / 10,
      }))
      .sort((a, b) => b.overtime_hours - a.overtime_hours);

    return {
      week_start: weekStart,
      zone: zone || 'all',
      total_hours: Math.round(totalHours * 10) / 10,
      total_cost: Math.round(totalCost * 100) / 100,
      by_day: Object.entries(byDay).map(([date, d]) => ({
        date,
        shifts: d.shifts,
        hours: Math.round(d.hours * 10) / 10,
        cost: Math.round(d.cost * 100) / 100,
      })),
      by_position: Object.entries(byPosition)
        .sort((a, b) => b[1].hours - a[1].hours)
        .map(([name, d]) => ({
          position: name,
          hours: Math.round(d.hours * 10) / 10,
          cost: Math.round(d.cost * 100) / 100,
          unique_employees: d.employees.size,
        })),
      overtime: {
        employees_over_40h: overtimeEmployees.length,
        details: overtimeEmployees,
      },
    };
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/tools/data/schedule.ts
git commit -m "feat(agent): add read-only schedule tools (overview, employee schedule, labor summary)"
```

---

## Task 4: Create Evaluation Tool Executor

Add the `get_evaluation_status` tool, feature-gated behind `enable_evaluations`.

**Files:**
- Create: `apps/agent/src/tools/data/evaluations.ts`

**Step 1: Create the evaluations tool file**

```typescript
/**
 * Evaluation Tools — read-only evaluation and certification insights for Levi AI.
 *
 * Feature-gated: only available when org has enable_evaluations=true.
 *
 * Tables used:
 * - evaluations (id, employee_id, leader_id, evaluation_date, month, status, state_before, state_after, rating_status, notes)
 * - certification_audit (id, employee_id, audit_date, status_before, status_after, all_positions_qualified, position_averages)
 * - employees (id, full_name, certified_status)
 */

import { createClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache';

export async function getEvaluationStatus(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
) {
  if (!locationId) {
    return { error: 'Evaluation status requires a location context.' };
  }

  const employeeId = args.employee_id as string | undefined;
  const cacheKey = `eval_status:${locationId}:${employeeId || 'all'}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.TEAM, async () => {
    const supabase = createClient();

    if (employeeId) {
      // ── Individual employee eval history ──
      const [evalsResult, auditResult, empResult] = await Promise.all([
        supabase
          .from('evaluations')
          .select('id, evaluation_date, month, status, rating_status, state_before, state_after, leader_name, notes')
          .eq('employee_id', employeeId)
          .eq('org_id', orgId)
          .order('evaluation_date', { ascending: false })
          .limit(10),
        supabase
          .from('certification_audit')
          .select('audit_date, status_before, status_after, all_positions_qualified, position_averages')
          .eq('employee_id', employeeId)
          .eq('org_id', orgId)
          .order('audit_date', { ascending: false })
          .limit(5),
        supabase
          .from('employees')
          .select('full_name, certified_status')
          .eq('id', employeeId)
          .maybeSingle(),
      ]);

      return {
        employee_id: employeeId,
        employee_name: empResult.data?.full_name || 'Unknown',
        current_certification: empResult.data?.certified_status || 'Unknown',
        evaluations: (evalsResult.data || []).map((e: any) => ({
          date: e.evaluation_date,
          month: e.month,
          status: e.status,
          rating_passed: e.rating_status,
          state_before: e.state_before,
          state_after: e.state_after,
          leader: e.leader_name,
          notes: e.notes,
        })),
        certification_history: (auditResult.data || []).map((a: any) => ({
          audit_date: a.audit_date,
          from: a.status_before,
          to: a.status_after,
          all_qualified: a.all_positions_qualified,
          position_averages: a.position_averages,
        })),
      };
    } else {
      // ── Location-wide eval overview ──
      const [evalsResult, certResult] = await Promise.all([
        supabase
          .from('evaluations')
          .select('id, employee_id, employee_name, evaluation_date, month, status, state_before, state_after')
          .eq('location_id', locationId)
          .eq('org_id', orgId)
          .order('evaluation_date', { ascending: false })
          .limit(50),
        supabase
          .from('employees')
          .select('id, full_name, certified_status')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .eq('active', true),
      ]);

      const evals = evalsResult.data || [];
      const employees = certResult.data || [];

      // Count by status
      const byStatus: Record<string, number> = {};
      for (const e of evals) {
        const s = (e as any).status;
        byStatus[s] = (byStatus[s] || 0) + 1;
      }

      // Certification breakdown
      const certBreakdown: Record<string, number> = {};
      for (const emp of employees as any[]) {
        const cs = emp.certified_status || 'Unknown';
        certBreakdown[cs] = (certBreakdown[cs] || 0) + 1;
      }

      // Upcoming evaluations (Planned or Scheduled)
      const upcoming = evals
        .filter((e: any) => e.status === 'Planned' || e.status === 'Scheduled')
        .slice(0, 10)
        .map((e: any) => ({
          employee_name: e.employee_name,
          date: e.evaluation_date,
          month: e.month,
          status: e.status,
        }));

      // Recent completions
      const recent = evals
        .filter((e: any) => e.status === 'Completed')
        .slice(0, 10)
        .map((e: any) => ({
          employee_name: e.employee_name,
          date: e.evaluation_date,
          state_change: e.state_before && e.state_after
            ? `${e.state_before} → ${e.state_after}`
            : null,
        }));

      return {
        total_evaluations: evals.length,
        by_status: byStatus,
        certification_breakdown: certBreakdown,
        total_employees: employees.length,
        upcoming_evaluations: upcoming,
        recent_completions: recent,
      };
    }
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/tools/data/evaluations.ts
git commit -m "feat(agent): add evaluation status tool with cert audit history"
```

---

## Task 5: Register New Tools in Tool Registry

Add the new schedule and evaluation tools to the tool registry, and wire them into `buildDataTools`.

**Files:**
- Modify: `apps/agent/src/lib/tool-registry.ts`

**Step 1: Add imports for new tool executors**

At the top of `tool-registry.ts`, add:

```typescript
import { getScheduleOverview, getEmployeeSchedule, getLaborSummary } from '../tools/data/schedule';
import { getEvaluationStatus } from '../tools/data/evaluations';
```

**Step 2: Add new tools to `buildDataTools()`**

Inside the `buildDataTools` function return object, after `get_pillar_scores`, add:

```typescript
    get_schedule_overview: tool({
      description:
        'Get the current week schedule overview: total shifts, assigned vs unassigned, hours and projected cost by day and position. Use for broad schedule questions like "how does the schedule look?" or "are we fully staffed?". Defaults to current week.',
      parameters: z.object({
        week_start: z.string().optional().describe('Week start date YYYY-MM-DD (defaults to current week Sunday)'),
      }),
      execute: async (input) => {
        return await getScheduleOverview(input, orgId, locationId);
      },
    }),

    get_employee_schedule: tool({
      description:
        'Get one employee\'s assigned shifts for the current and next week. Shows shift times, positions, break durations, and total weekly hours. Requires employee_id (use lookup_employee first).',
      parameters: z.object({
        employee_id: z.string().describe('The UUID of the employee'),
        weeks: z.number().optional().describe('Number of weeks to include (default: 2, max: 4)'),
      }),
      execute: async (input) => {
        return await getEmployeeSchedule(input, orgId, locationId);
      },
    }),

    get_labor_summary: tool({
      description:
        'Get labor cost breakdown for a week: total hours and cost by day and position, plus overtime detection (employees over 40 hours). Optional FOH/BOH zone filter. Use for labor cost questions. Defaults to current week.',
      parameters: z.object({
        week_start: z.string().optional().describe('Week start date YYYY-MM-DD (defaults to current week)'),
        zone: z.enum(['FOH', 'BOH']).optional().describe('Filter to front-of-house or back-of-house only'),
      }),
      execute: async (input) => {
        return await getLaborSummary(input, orgId, locationId);
      },
    }),
```

**Step 3: Add evaluation tool (conditionally)**

Still inside `buildDataTools`, add the evaluation tool conditionally:

```typescript
    // Feature-gated: evaluations
    ...(features?.evaluations ? {
      get_evaluation_status: tool({
        description:
          'Get evaluation and certification status. With employee_id: individual eval history + certification audit trail. Without: location-wide eval overview (upcoming, completed, by status, certification breakdown). Only available when evaluations feature is enabled.',
        parameters: z.object({
          employee_id: z.string().optional().describe('UUID of a specific employee. Omit for location-wide overview.'),
        }),
        execute: async (input) => {
          return await getEvaluationStatus(input, orgId, locationId);
        },
      }),
    } : {}),
```

**Step 4: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/agent/src/lib/tool-registry.ts
git commit -m "feat(agent): register schedule and evaluation tools in tool registry"
```

---

## Task 6: Create Orchestrator Module

The orchestrator uses Opus 4.6 via `generateObject` to produce a structured execution plan.

**Files:**
- Create: `apps/agent/src/lib/orchestrator.ts`

**Step 1: Create the orchestrator file**

```typescript
/**
 * Orchestrator — Opus 4.6 generates a structured execution plan.
 *
 * Input: user message + conversation summary + org context summary + available tools
 * Output: ExecutionPlan (JSON) via Vercel AI SDK generateObject
 *
 * The orchestrator does NOT see full conversation history — it gets a
 * 2-3 sentence summary to keep input tokens minimal (~200-500 tokens).
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from './ai-provider';
import { TOOL_SUMMARIES, getAvailableToolNames } from './tool-registry';
import type { ModelMessage } from 'ai';

// ── Types ──────────────────────────────────────────────────────────────

export interface ExecutionPlan {
  steps: PlanStep[];
  synthesisDirective: string;
  responseStyle: 'concise' | 'detailed' | 'list';
}

export interface PlanStep {
  tool: string;
  args: Record<string, unknown>;
  purpose: string;
  dependsOn?: number;
}

// ── Conversation Summary ───────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Summarize the last 3-5 messages into a 2-3 sentence summary.
 * This keeps orchestrator input tokens low (~50-100 tokens).
 */
export function summarizeConversation(messages: ModelMessage[]): string {
  // Extract last 5 user+assistant messages with text content
  const recent = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-5)
    .map((m) => {
      const text = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join(' ')
          : '';
      return { role: m.role, text: text.slice(0, 200) }; // Truncate long messages
    })
    .filter((m) => m.text.length > 0);

  if (recent.length === 0) return 'No prior conversation.';

  // Format as compact summary
  return recent
    .map((m) => {
      const prefix = m.role === 'user' ? 'User asked:' : 'Levi responded:';
      return `${prefix} ${m.text}`;
    })
    .join(' ');
}

// ── Orchestrator Prompt ────────────────────────────────────────────────

function buildOrchestratorPrompt(
  orgContextSummary: string,
  availableTools: string[]
): string {
  const toolList = availableTools
    .map((name) => `- ${name}: ${TOOL_SUMMARIES[name] || 'No description'}`)
    .join('\n');

  return `You are an AI planning agent for Levi, a restaurant management assistant. Your job is to analyze the user's question and produce an execution plan — a list of tool calls that will fetch the data needed to answer it.

## Available Tools
${toolList}

## Org Context
${orgContextSummary}

## Rules
1. Output a plan with 1-4 tool calls. Most questions need 1-2 tools.
2. Prefer get_employee_profile over separate ratings/infractions calls — it includes both.
3. Use get_team_overview for broad questions about the team, performance, or trends.
4. Use get_position_rankings ONLY when the user explicitly names ONE position.
5. For "who is working today/this week", use get_schedule_overview.
6. For "what is [name]'s schedule", first lookup_employee then get_employee_schedule.
7. If the question needs no data (greeting, clarification, general knowledge), return an empty steps array.
8. Set synthesisDirective to tell the worker HOW to present the data (e.g., "Compare the two employees' ratings trends and highlight who is improving faster").
9. Set responseStyle based on the question: 'concise' for simple lookups, 'detailed' for analysis, 'list' for ranking/listing questions.
10. If a step depends on a previous step's output (e.g., lookup_employee → get_employee_profile), set dependsOn to the step index (0-based).`;
}

// ── Plan Schema ────────────────────────────────────────────────────────

const PlanStepSchema = z.object({
  tool: z.string().describe('Tool name from the available tools list'),
  args: z.record(z.unknown()).describe('Arguments to pass to the tool'),
  purpose: z.string().describe('Brief explanation of why this tool is called — passed to the worker for context'),
  dependsOn: z.number().optional().describe('Index of a previous step this depends on (0-based). Omit if independent.'),
});

const ExecutionPlanSchema = z.object({
  steps: z.array(PlanStepSchema).max(6).describe('Ordered list of tool calls. Max 4 for most queries, up to 6 for complex multi-employee comparisons.'),
  synthesisDirective: z.string().describe('Instructions for the worker on how to interpret and present the data.'),
  responseStyle: z.enum(['concise', 'detailed', 'list']).describe('How verbose the response should be.'),
});

// ── Main Function ──────────────────────────────────────────────────────

export async function generatePlan(input: {
  userMessage: string;
  conversationSummary: string;
  orgContextSummary: string;
  features?: { evaluations?: boolean };
}): Promise<{
  plan: ExecutionPlan;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const availableTools = getAvailableToolNames(input.features);
  const systemPrompt = buildOrchestratorPrompt(input.orgContextSummary, availableTools);

  const userPrompt = input.conversationSummary !== 'No prior conversation.'
    ? `Recent context: ${input.conversationSummary}\n\nCurrent question: ${input.userMessage}`
    : input.userMessage;

  const result = await generateObject({
    model: models.orchestrator,
    schema: ExecutionPlanSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return {
    plan: result.object as ExecutionPlan,
    usage: {
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
    },
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/lib/orchestrator.ts
git commit -m "feat(agent): create orchestrator module with Opus 4.6 plan generation"
```

---

## Task 7: Create Tool Executor Module

Deterministic tool execution from the orchestrator's plan — no LLM in the loop.

**Files:**
- Create: `apps/agent/src/lib/tool-executor.ts`

**Step 1: Create the tool executor file**

```typescript
/**
 * Tool Executor — Deterministic plan execution.
 *
 * Runs tools from the orchestrator's plan:
 * - Groups independent steps for parallel execution
 * - Sequential steps wait for their dependency
 * - 1 retry on transient errors (5xx, timeout) with 500ms delay
 * - Returns results array for the worker
 */

import type { ExecutionPlan, PlanStep } from './orchestrator';
import type { CoreTool } from 'ai';

// ── Types ──────────────────────────────────────────────────────────────

export interface ToolResult {
  tool: string;
  stepIndex: number;
  purpose: string;
  data: unknown;
  error?: string;
  durationMs: number;
}

type StatusEmitter = (tool: string, label: string) => void;

// ── Human-Readable Labels ──────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  lookup_employee: 'Looking up employee',
  list_employees: 'Fetching employee list',
  get_employee_profile: 'Loading employee profile',
  get_team_overview: 'Analyzing team performance',
  get_discipline_summary: 'Reviewing discipline data',
  get_position_rankings: 'Ranking position performance',
  get_pillar_scores: 'Calculating pillar scores',
  get_schedule_overview: 'Checking schedule',
  get_employee_schedule: 'Loading employee schedule',
  get_labor_summary: 'Analyzing labor costs',
  get_evaluation_status: 'Checking evaluation status',
};

// ── Retry Helper ───────────────────────────────────────────────────────

function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('fetch failed') ||
      msg.includes('5') // 5xx status codes
    );
  }
  return false;
}

async function executeWithRetry(
  fn: () => Promise<unknown>,
  retries: number = 1,
  delayMs: number = 500
): Promise<unknown> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0 && isTransientError(err)) {
      await new Promise((r) => setTimeout(r, delayMs));
      return executeWithRetry(fn, retries - 1, delayMs);
    }
    throw err;
  }
}

// ── Execute Single Step ────────────────────────────────────────────────

async function executeStep(
  step: PlanStep,
  stepIndex: number,
  tools: Record<string, CoreTool>,
  emitStatus?: StatusEmitter,
  previousResults?: ToolResult[]
): Promise<ToolResult> {
  const start = Date.now();

  // Emit status event
  const label = TOOL_LABELS[step.tool] || `Running ${step.tool}`;
  emitStatus?.(step.tool, label);

  // Resolve dynamic args from previous step results
  const resolvedArgs = resolveArgs(step.args, previousResults);

  const toolDef = tools[step.tool];
  if (!toolDef) {
    return {
      tool: step.tool,
      stepIndex,
      purpose: step.purpose,
      data: null,
      error: `Unknown tool: ${step.tool}`,
      durationMs: Date.now() - start,
    };
  }

  try {
    const data = await executeWithRetry(async () => {
      // Vercel AI SDK tool execute
      if ('execute' in toolDef && typeof toolDef.execute === 'function') {
        return await toolDef.execute(resolvedArgs, { toolCallId: `step-${stepIndex}`, messages: [], abortSignal: undefined as any });
      }
      throw new Error(`Tool ${step.tool} has no execute function`);
    });

    return {
      tool: step.tool,
      stepIndex,
      purpose: step.purpose,
      data,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      tool: step.tool,
      stepIndex,
      purpose: step.purpose,
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - start,
    };
  }
}

// ── Resolve Dynamic Args ───────────────────────────────────────────────

/**
 * If the orchestrator sets an arg like { employee_id: "$step0.employee_id" },
 * resolve it from previous step results.
 */
function resolveArgs(
  args: Record<string, unknown>,
  previousResults?: ToolResult[]
): Record<string, unknown> {
  if (!previousResults || previousResults.length === 0) return args;

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.startsWith('$step')) {
      // Parse $stepN.path.to.value
      const match = value.match(/^\$step(\d+)\.(.+)$/);
      if (match) {
        const stepIdx = parseInt(match[1], 10);
        const path = match[2];
        const stepResult = previousResults.find((r) => r.stepIndex === stepIdx);
        if (stepResult?.data) {
          resolved[key] = getNestedValue(stepResult.data, path);
          continue;
        }
      }
    }
    resolved[key] = value;
  }
  return resolved;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    // Handle array index
    if (/^\d+$/.test(part)) {
      current = Array.isArray(current) ? current[parseInt(part, 10)] : current[part];
    } else {
      current = current[part];
    }
  }
  return current;
}

// ── Execute Full Plan ──────────────────────────────────────────────────

export async function executePlan(
  plan: ExecutionPlan,
  tools: Record<string, CoreTool>,
  emitStatus?: StatusEmitter
): Promise<ToolResult[]> {
  const { steps } = plan;
  if (steps.length === 0) return [];

  const results: ToolResult[] = [];
  const completedSteps = new Map<number, ToolResult>();

  // Group steps by dependency level
  // Level 0: no dependencies → run in parallel
  // Level N: depends on a level N-1 step → wait for dependency
  const levels: number[][] = [];
  const stepLevels = new Map<number, number>();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.dependsOn === undefined || step.dependsOn === null) {
      stepLevels.set(i, 0);
    } else {
      const depLevel = stepLevels.get(step.dependsOn) ?? 0;
      stepLevels.set(i, depLevel + 1);
    }
  }

  // Group by level
  const maxLevel = Math.max(...Array.from(stepLevels.values()), 0);
  for (let level = 0; level <= maxLevel; level++) {
    const stepsAtLevel: number[] = [];
    for (const [idx, lvl] of stepLevels.entries()) {
      if (lvl === level) stepsAtLevel.push(idx);
    }
    if (stepsAtLevel.length > 0) levels.push(stepsAtLevel);
  }

  // Execute level by level
  for (const levelSteps of levels) {
    const levelResults = await Promise.all(
      levelSteps.map((idx) =>
        executeStep(
          steps[idx],
          idx,
          tools,
          emitStatus,
          Array.from(completedSteps.values())
        )
      )
    );

    for (const result of levelResults) {
      completedSteps.set(result.stepIndex, result);
      results.push(result);
    }
  }

  return results;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/lib/tool-executor.ts
git commit -m "feat(agent): create deterministic tool executor with parallel execution and retry"
```

---

## Task 8: Create Worker Module

The worker receives tool results and generates the streamed response using MiniMax M2.5.

**Files:**
- Create: `apps/agent/src/lib/worker.ts`

**Step 1: Create the worker file**

```typescript
/**
 * Worker — MiniMax M2.5 synthesizes tool results into a streamed response.
 *
 * The worker:
 * - Receives tool results + synthesis directive from the orchestrator
 * - Has access to display tools only (show_employee_list, show_employee_card)
 * - Generates the user-facing streamed response
 * - Does NOT select or call data tools
 */

import { streamText, smoothStream } from 'ai';
import { models } from './ai-provider';
import { buildDisplayTools } from './tool-registry';
import type { ToolResult } from './tool-executor';
import type { ModelMessage } from 'ai';

// ── Types ──────────────────────────────────────────────────────────────

export interface WorkerInput {
  synthesisDirective: string;
  responseStyle: 'concise' | 'detailed' | 'list';
  toolResults: ToolResult[];
  conversationHistory: ModelMessage[];
  orgContext: string;
  userName: string;
  currentDate: string;
}

// ── Worker System Prompt ───────────────────────────────────────────────

function buildWorkerPrompt(input: WorkerInput): string {
  const toolResultsText = input.toolResults
    .map((r) => {
      const header = `[${r.tool}] (${r.purpose})`;
      if (r.error) return `${header}\nERROR: ${r.error}`;
      return `${header}\n${JSON.stringify(r.data, null, 0)}`;
    })
    .join('\n\n');

  return `You are Levi, a friendly and knowledgeable restaurant management assistant. You help restaurant leaders understand their team data.

## Identity Rules
- Never say "I don't have access to" or "I can't see" — if data is missing, say "Based on the data available..."
- Never mention tools, APIs, databases, or technical implementation details
- Never say "According to the data" — just present findings directly
- Use bold for employee names and key numbers only
- Be conversational but efficient — no filler phrases
- Use the user's language (English or Spanish) matching their question

## Forbidden Phrases
Never use: "Certainly!", "Absolutely!", "Great question!", "I'd be happy to", "Let me", "Based on my analysis", "dive into", "Here's what I found"

## Response Style: ${input.responseStyle}
${input.responseStyle === 'concise' ? 'Keep it brief — 2-3 sentences max.' : ''}
${input.responseStyle === 'detailed' ? 'Provide thorough analysis with context and trends.' : ''}
${input.responseStyle === 'list' ? 'Use a numbered or bulleted list format.' : ''}

## Synthesis Directive
${input.synthesisDirective}

## Display Tools
You can call show_employee_list or show_employee_card to render visual cards. Only use when the visual genuinely adds value — not for every response.

## Context
User: ${input.userName}
Date: ${input.currentDate}
${input.orgContext}

## Tool Results
${toolResultsText}

${input.toolResults.some((r) => r.error) ? '\nNote: Some tools returned errors. Acknowledge gaps briefly and answer with available data.' : ''}`;
}

// ── Stream Worker Response ─────────────────────────────────────────────

export function streamWorkerResponse(input: WorkerInput) {
  const displayTools = buildDisplayTools();
  const systemPrompt = buildWorkerPrompt(input);

  return streamText({
    model: models.primary, // MiniMax M2.5
    system: systemPrompt,
    messages: input.conversationHistory,
    tools: displayTools,
    maxSteps: 2, // Worker may call 1-2 display tools then respond
    experimental_transform: smoothStream({ chunking: 'word', _internal: { delay: 15 } }),
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/lib/worker.ts
git commit -m "feat(agent): create worker module for MiniMax synthesis with display tools"
```

---

## Task 9: Split Prompts into Orchestrator + Worker

Add a helper in `prompts.ts` that builds the compressed org context summary for the orchestrator (~200 tokens). Keep `buildSystemPrompt()` for legacy fallback.

**Files:**
- Modify: `apps/agent/src/lib/prompts.ts`

**Step 1: Add `buildOrgContextSummary()` function**

Add this function at the end of `prompts.ts` (do NOT remove or modify existing functions):

```typescript
/**
 * Build a compressed org context summary for the orchestrator.
 * ~200 tokens — just enough for the orchestrator to make tool selection decisions.
 * NOT used for the worker (worker gets full org context).
 */
export function buildOrgContextSummary(orgContext: OrgContext): string {
  const parts: string[] = [];

  // Location
  if (orgContext.locationName) {
    parts.push(`Location: ${orgContext.locationName} (${orgContext.locationNumber || 'N/A'})`);
  }
  parts.push(`Active employees: ${orgContext.employeeCount}`);

  // Roles (compact)
  if (orgContext.roles.length > 0) {
    const roleNames = orgContext.roles.map((r) => r.name).join(', ');
    parts.push(`Roles: ${roleNames}`);
  }

  // Positions (compact)
  if (orgContext.positions.length > 0) {
    const foh = orgContext.positions.filter((p) => p.zone === 'FOH').map((p) => p.name);
    const boh = orgContext.positions.filter((p) => p.zone === 'BOH').map((p) => p.name);
    if (foh.length > 0) parts.push(`FOH positions: ${foh.join(', ')}`);
    if (boh.length > 0) parts.push(`BOH positions: ${boh.join(', ')}`);
  }

  // Features (compact)
  const enabledFeatures: string[] = [];
  if (orgContext.features.certifications) enabledFeatures.push('Certifications');
  if (orgContext.features.evaluations) enabledFeatures.push('Evaluations');
  if (orgContext.features.pip) enabledFeatures.push('PIP');
  if (enabledFeatures.length > 0) parts.push(`Enabled features: ${enabledFeatures.join(', ')}`);

  // Pillars (compact)
  if (orgContext.pillars && orgContext.pillars.length > 0) {
    const pillarNames = orgContext.pillars.map((p) => p.name).join(', ');
    parts.push(`OE Pillars: ${pillarNames}`);
  }

  return parts.join('\n');
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/agent/src/lib/prompts.ts
git commit -m "feat(agent): add buildOrgContextSummary for orchestrator prompt"
```

---

## Task 10: Refactor Chat Route for New Pipeline

This is the main integration task. Modify `chat.ts` to use the new orchestrator → executor → worker pipeline, keeping the legacy path as fallback.

**Files:**
- Modify: `apps/agent/src/routes/ai/chat.ts`

**Step 1: Add imports for new modules**

At the top of `chat.ts`, add:

```typescript
import { generatePlan, summarizeConversation } from '../lib/orchestrator';
import { executePlan, type ToolResult } from '../lib/tool-executor';
import { streamWorkerResponse, type WorkerInput } from '../lib/worker';
import { buildDataTools, buildDisplayTools } from '../lib/tool-registry';
import { buildOrgContextSummary } from '../lib/prompts';
```

**Step 2: Extract the legacy `buildTools()` into a wrapper**

Rename the existing inline `buildTools()` function to `buildLegacyTools()` to keep it as fallback. Then create a new `buildTools()` that delegates to the registry:

```typescript
// Keep existing buildTools as legacy fallback
function buildLegacyTools(
  orgId: string,
  locationId?: string,
  features?: { certifications: boolean; evaluations: boolean; pip: boolean; customRoles: boolean }
) {
  // ... existing inline tool definitions (unchanged)
}
```

**Step 3: Add the orchestrated pipeline**

In the POST handler, before the existing `streamText()` call, add the new pipeline:

```typescript
// ── New Pipeline: Orchestrator → Executor → Worker ──
let useFallback = false;
let orchestratorUsage = { inputTokens: 0, outputTokens: 0 };

try {
  // 1. Build orchestrator input
  const conversationSummary = summarizeConversation(modelMessages);
  const orgContextSummary = buildOrgContextSummary(orgContext);

  // 2. Generate plan
  const { plan, usage: orchUsage } = await generatePlan({
    userMessage: lastUserMessage,
    conversationSummary,
    orgContextSummary,
    features: orgContext.features,
  });
  orchestratorUsage = orchUsage;

  // 3. Execute tools deterministically
  const dataTools = buildDataTools({
    orgId,
    locationId: effectiveLocationId,
    features: orgContext.features,
  });

  const emitStatus = (tool: string, label: string) => {
    // Emit SSE status events (same as today)
    controller.enqueue(encoder.encode(`event: data-tool-status\ndata: ${JSON.stringify({ tool, label })}\n\n`));
  };

  const toolResults = await executePlan(plan, dataTools, emitStatus);

  // 4. Stream worker response
  const workerInput: WorkerInput = {
    synthesisDirective: plan.synthesisDirective,
    responseStyle: plan.responseStyle,
    toolResults,
    conversationHistory: modelMessages,
    orgContext: buildSystemPrompt(orgContext, retrievedContext, userName, currentDate),
    userName,
    currentDate,
  };

  const workerStream = streamWorkerResponse(workerInput);

  // 5. Stream to client (same SSE protocol as today)
  // ... pipe workerStream through existing SSE encoder ...

} catch (orchestratorError) {
  console.warn('[Chat] Orchestrator failed, falling back to legacy mode:', orchestratorError);
  useFallback = true;
}

if (useFallback) {
  // Legacy path: MiniMax with tool loop (existing code, unchanged)
  // ... existing streamText() call ...
}
```

> **Note to implementer:** This is the most complex task. The exact integration depends on the current SSE streaming setup in `chat.ts`. The key changes are:
> 1. Try the new pipeline first
> 2. If it fails, fall back to legacy `streamText()` with inline tools
> 3. The SSE protocol to the mobile app stays identical
> 4. Track `fallback: true` in usage logging when legacy mode is used

**Step 4: Update display tool handling**

The worker's display tool calls need to emit `data-ui-block` SSE events, same as today. The existing pattern in `chat.ts` checks for `__display: true` in tool results — this stays the same since the worker uses the same display tools.

**Step 5: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/agent/src/routes/ai/chat.ts
git commit -m "feat(agent): integrate orchestrator-worker pipeline with legacy fallback"
```

---

## Task 11: Update Usage Tracker for Split Cost Tracking

Add Opus 4.6 pricing and track orchestrator + worker costs separately.

**Files:**
- Modify: `apps/agent/src/lib/usage-tracker.ts`

**Step 1: Add Opus 4.6 pricing**

In the `MODEL_PRICING` constant, add:

```typescript
'anthropic/claude-opus-4-0-20250514': { input: 15.0, output: 75.0 },
```

**Step 2: Add orchestrated usage logging function**

Add a new function alongside the existing `logUsage()`:

```typescript
export async function logOrchestratedUsage(params: {
  orgId: string;
  userId?: string;
  conversationId?: string;
  orchestratorModel: string;
  orchestratorInputTokens: number;
  orchestratorOutputTokens: number;
  workerModel: string;
  workerInputTokens: number;
  workerOutputTokens: number;
  toolCount: number;
  toolDurationMs: number;
  latencyMs: number;
  fallback?: boolean;
}) {
  const orchCost = calculateCost(params.orchestratorModel, params.orchestratorInputTokens, params.orchestratorOutputTokens);
  const workerCost = calculateCost(params.workerModel, params.workerInputTokens, params.workerOutputTokens);

  const supabase = createClient();
  await supabase.from('levi_usage_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    conversation_id: params.conversationId,
    // Totals (backward compat)
    model: params.workerModel,
    tier: 'orchestrated',
    task_type: 'chat',
    input_tokens: params.orchestratorInputTokens + params.workerInputTokens,
    output_tokens: params.orchestratorOutputTokens + params.workerOutputTokens,
    cost_usd: orchCost + workerCost,
    latency_ms: params.latencyMs,
    escalated: false,
    // New columns
    orchestrator_model: params.orchestratorModel,
    orchestrator_input_tokens: params.orchestratorInputTokens,
    orchestrator_output_tokens: params.orchestratorOutputTokens,
    orchestrator_cost_usd: orchCost,
    worker_model: params.workerModel,
    worker_input_tokens: params.workerInputTokens,
    worker_output_tokens: params.workerOutputTokens,
    worker_cost_usd: workerCost,
    tool_count: params.toolCount,
    tool_duration_ms: params.toolDurationMs,
    fallback: params.fallback || false,
  });
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/agent/src/lib/usage-tracker.ts
git commit -m "feat(agent): add orchestrated usage logging with split cost tracking"
```

---

## Task 12: Database Migration for Usage Log Columns

Add new columns to `levi_usage_log` for orchestrator + worker split tracking.

**Files:**
- Create: `supabase/migrations/20260226_levi_usage_log_orchestrator_columns.sql`

**Step 1: Write the migration**

```sql
-- Add orchestrator-worker split tracking columns to levi_usage_log
-- Existing columns (model, input_tokens, output_tokens, cost_usd) become totals
-- for backward compatibility.

ALTER TABLE levi_usage_log
  ADD COLUMN IF NOT EXISTS orchestrator_model TEXT,
  ADD COLUMN IF NOT EXISTS orchestrator_input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS orchestrator_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS orchestrator_cost_usd NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS worker_model TEXT,
  ADD COLUMN IF NOT EXISTS worker_input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS worker_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS worker_cost_usd NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS tool_count INTEGER,
  ADD COLUMN IF NOT EXISTS tool_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS fallback BOOLEAN DEFAULT false;

-- Index for filtering orchestrated vs fallback requests
CREATE INDEX IF NOT EXISTS idx_usage_log_fallback ON levi_usage_log(fallback) WHERE fallback = true;
```

**Step 2: Apply the migration**

Run via Supabase MCP or manually:
```bash
# Via supabase CLI or dashboard
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260226_levi_usage_log_orchestrator_columns.sql
git commit -m "feat(db): add orchestrator-worker columns to levi_usage_log"
```

---

## Task 13: Delete Redundant Tool Files

Remove `get_employee_ratings` and `get_employee_infractions` standalone tools since `get_employee_profile` covers both.

**Files:**
- Delete: `apps/agent/src/tools/data/ratings.ts`
- Delete: `apps/agent/src/tools/data/infractions.ts`
- Modify: `apps/agent/src/routes/ai/chat.ts` (remove imports and tool registrations)

**Step 1: Remove imports from chat.ts**

In `chat.ts`, remove the import lines for `getEmployeeRatings` and `getEmployeeInfractions`. Also remove the `get_employee_ratings` and `get_employee_infractions` tool definitions from the `buildLegacyTools()` function.

**Step 2: Delete the files**

```bash
rm apps/agent/src/tools/data/ratings.ts
rm apps/agent/src/tools/data/infractions.ts
```

**Step 3: Update any index/barrel exports**

Check if there's a barrel export file in `apps/agent/src/tools/` and remove the deleted tool exports.

**Step 4: Verify TypeScript compiles**

Run: `cd apps/agent && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(agent): remove redundant ratings and infractions tools (consolidated into profile)"
```

---

## Task 14: Update Tool Descriptions (Poka-Yoke)

Update all tool descriptions to include "when to use this" AND "when to use something else instead" guidance, moving rules from the system prompt INTO the tool descriptions.

**Files:**
- Modify: `apps/agent/src/lib/tool-registry.ts` (already has improved descriptions from Task 2)

**Step 1: Review and refine descriptions**

The descriptions in Task 2 already follow poka-yoke principles. Verify that each tool description:
1. States what the tool does
2. States when to use it
3. States when to use a DIFFERENT tool instead

This is already done in the initial `tool-registry.ts` creation. This task is a verification pass.

**Step 2: Remove redundant system prompt rules**

In `prompts.ts`, the `buildSystemPrompt()` function may have rules like "NEVER call get_position_rankings more than once" — these can be trimmed since the tool descriptions now contain the guidance. But keep `buildSystemPrompt()` intact for legacy fallback.

**Step 3: Commit**

```bash
git add apps/agent/src/lib/tool-registry.ts apps/agent/src/lib/prompts.ts
git commit -m "refactor(agent): improve tool descriptions with poka-yoke guidance"
```

---

## Task 15: Integration Testing

Test the full pipeline end-to-end.

**Files:**
- No new files — manual testing

**Step 1: Start the agent locally**

```bash
cd apps/agent && pnpm dev
```

**Step 2: Test basic queries via curl**

```bash
# Simple greeting (should return empty plan, direct response)
curl -X POST http://0.0.0.0:3001/api/ai/chat \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hey Levi"}'

# Team overview (should call get_team_overview)
curl -X POST http://0.0.0.0:3001/api/ai/chat \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message": "How is the team doing?"}'

# Employee lookup + profile (should chain lookup → profile)
curl -X POST http://0.0.0.0:3001/api/ai/chat \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about John"}'

# Schedule query (should call get_schedule_overview)
curl -X POST http://0.0.0.0:3001/api/ai/chat \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message": "How does this week schedule look?"}'
```

**Step 3: Test legacy fallback**

Temporarily set the orchestrator model to an invalid model name and verify the system falls back to legacy mode with `fallback: true` in the usage log.

**Step 4: Verify mobile app SSE**

Send messages from the phone and verify:
- Tool status events appear normally
- Text streams word-by-word
- Display cards render correctly
- No visible difference from the user's perspective

**Step 5: Check usage logs**

Query `levi_usage_log` to verify:
- Orchestrator and worker costs are tracked separately
- Total cost matches orchestrator + worker combined
- `fallback` column is `false` for orchestrated requests

```sql
SELECT
  model, tier, fallback,
  orchestrator_model, orchestrator_cost_usd,
  worker_model, worker_cost_usd,
  cost_usd AS total_cost,
  tool_count, tool_duration_ms
FROM levi_usage_log
ORDER BY created_at DESC
LIMIT 10;
```

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(agent): integration fixes from end-to-end testing"
```

---

## Task 16: Deploy to Develop

Push to `develop` branch for staging deployment to `levelset-agent-dev.fly.dev`.

**Step 1: Ensure all tests pass locally**

```bash
cd apps/agent && npx tsc --noEmit
```

**Step 2: Push to develop**

```bash
git push origin develop
```

**Step 3: Verify staging deployment**

```bash
curl https://levelset-agent-dev.fly.dev/health
```

**Step 4: Test from mobile app pointing to dev**

Update the mobile app's `EXPO_PUBLIC_API_URL` to point to dev and run through the same test queries from Task 15.

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Add Opus model | — | `ai-provider.ts` |
| 2 | Tool registry | `tool-registry.ts` | — |
| 3 | Schedule tools | `tools/data/schedule.ts` | — |
| 4 | Evaluation tool | `tools/data/evaluations.ts` | — |
| 5 | Register new tools | — | `tool-registry.ts` |
| 6 | Orchestrator | `orchestrator.ts` | — |
| 7 | Tool executor | `tool-executor.ts` | — |
| 8 | Worker | `worker.ts` | — |
| 9 | Split prompts | — | `prompts.ts` |
| 10 | Chat route refactor | — | `chat.ts` |
| 11 | Usage tracker | — | `usage-tracker.ts` |
| 12 | DB migration | migration `.sql` | — |
| 13 | Delete redundant tools | — | `chat.ts`, delete 2 files |
| 14 | Poka-yoke descriptions | — | `tool-registry.ts` |
| 15 | Integration testing | — | — |
| 16 | Deploy to develop | — | — |
