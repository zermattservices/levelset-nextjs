/**
 * Tool Registry — central registry for all Levi tools.
 *
 * Decouples tool schemas from the chat route so both the orchestrator
 * (for planning) and worker (for display tools) can reference them
 * independently.
 *
 * Tool categories:
 *   data    — Read-only queries (orchestrator plans these)
 *   display — UI cards (worker calls these)
 *   action  — Write operations (future — not yet implemented)
 */

import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';

import { lookupEmployee, listEmployees } from '../tools/data/employee.js';
import { getEmployeeProfile } from '../tools/data/profile.js';
import { getTeamOverview } from '../tools/data/team.js';
import { getDisciplineSummary } from '../tools/data/discipline.js';
import { getPositionRankings } from '../tools/data/rankings.js';
import { getPillarScores } from '../tools/data/pillars.js';
import { getOrgChart } from '../tools/data/org-chart.js';
import { getScheduleOverview, getEmployeeSchedule, getLaborSummary } from '../tools/data/schedule.js';
import { getEvaluationStatus } from '../tools/data/evaluations.js';
import { getRatingActivity } from '../tools/data/rating-activity.js';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolRegistryContext {
  orgId: string;
  locationId?: string;
  features?: {
    certifications: boolean;
    evaluations: boolean;
    pip: boolean;
    customRoles: boolean;
    orgChart: boolean;
  };
  isAdmin: boolean;
  employeeId?: string;
  hierarchyLevel: number;
  permissions: Set<string>;
  accessibleLocationIds: string[];
}

export type ToolCategory = 'data' | 'display' | 'action';

export interface ToolMeta {
  category: ToolCategory;
  summary: string;
  requiresConfirmation: boolean;
}

// ─── Tool Metadata ────────────────────────────────────────────────────────────

/**
 * Tool metadata registry — category, one-line summaries for the orchestrator
 * prompt, and confirmation requirements.
 *
 * Summaries are intentionally terse — the orchestrator sees these as a menu.
 */
export const TOOL_META: Record<string, ToolMeta> = {
  // Data tools
  lookup_employee: {
    category: 'data',
    summary: 'Search for an employee by name → returns ID, role, basic details',
    requiresConfirmation: false,
  },
  list_employees: {
    category: 'data',
    summary: 'List employees with filters (role, zone, leader, trainer) → count + list',
    requiresConfirmation: false,
  },
  get_employee_profile: {
    category: 'data',
    summary: 'Full employee profile (details + ratings + discipline) in one call — requires employee_id',
    requiresConfirmation: false,
  },
  get_team_overview: {
    category: 'data',
    summary: 'Location-wide team snapshot: role breakdown, position averages, top/bottom performers, discipline attention',
    requiresConfirmation: false,
  },
  get_discipline_summary: {
    category: 'data',
    summary: 'Discipline deep dive — with employee_id: individual history; without: location-wide overview',
    requiresConfirmation: false,
  },
  get_position_rankings: {
    category: 'data',
    summary: 'Rank employees for ONE specific position by rating average',
    requiresConfirmation: false,
  },
  get_pillar_scores: {
    category: 'data',
    summary: 'OE pillar scores (0-100) with position breakdown — location-wide or per-employee',
    requiresConfirmation: false,
  },
  get_org_chart: {
    category: 'data',
    summary: 'Org chart tree: departments, groups, supervisors, direct reports',
    requiresConfirmation: false,
  },
  get_schedule_overview: {
    category: 'data',
    summary: 'Week schedule status: shift count, total hours, coverage by day',
    requiresConfirmation: false,
  },
  get_employee_schedule: {
    category: 'data',
    summary: 'Individual employee shifts for upcoming weeks — requires employee_id',
    requiresConfirmation: false,
  },
  get_labor_summary: {
    category: 'data',
    summary: 'Labor costs, hours, OT breakdown by zone (FOH/BOH)',
    requiresConfirmation: false,
  },
  get_evaluation_status: {
    category: 'data',
    summary: 'Evaluation overview (location-wide) or individual eval history — requires enable_evaluations',
    requiresConfirmation: false,
  },
  get_rating_activity: {
    category: 'data',
    summary: 'Flexible ratings query: who submitted/received ratings, rating counts by rater/employee/position/day, individual ratings with criteria scores. Supports date range, rater, employee, and position filters.',
    requiresConfirmation: false,
  },

  // Display tools
  show_employee_list: {
    category: 'display',
    summary: 'Show a visual ranked-list card in the chat',
    requiresConfirmation: false,
  },
  show_employee_card: {
    category: 'display',
    summary: 'Show a visual card for a single employee',
    requiresConfirmation: false,
  },
};

// ─── Tool Summaries for Orchestrator ──────────────────────────────────────────

/**
 * Get tool summaries for the orchestrator prompt.
 * Only includes tools available for the given context (feature-gated).
 */
export function getToolSummaries(ctx: ToolRegistryContext): Record<string, string> {
  const summaries: Record<string, string> = {};

  for (const [name, meta] of Object.entries(TOOL_META)) {
    // Skip display tools — orchestrator doesn't plan these
    if (meta.category === 'display') continue;

    // Feature gate: org chart
    if (name === 'get_org_chart' && !ctx.features?.orgChart) continue;

    // Feature gate: evaluations
    if (name === 'get_evaluation_status' && !ctx.features?.evaluations) continue;

    // Feature gate: schedule tools — always available (no feature flag needed)

    summaries[name] = meta.summary;
  }

  return summaries;
}

// ─── Tool Execution ───────────────────────────────────────────────────────────

/**
 * Execute a tool by name. Used by the deterministic tool executor.
 * All tools receive (args, orgId, locationId?) and return Promise<string>.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolRegistryContext
): Promise<string> {
  const { orgId, locationId, features } = ctx;

  switch (name) {
    case 'lookup_employee':
      return lookupEmployee(args, orgId, locationId);

    case 'list_employees':
      return listEmployees(args, orgId, locationId);

    case 'get_employee_profile':
      return getEmployeeProfile(args, orgId, locationId);

    case 'get_team_overview':
      return getTeamOverview(args, orgId, locationId, {
        certificationsEnabled: features?.certifications ?? false,
      });

    case 'get_discipline_summary':
      return getDisciplineSummary(args, orgId, locationId);

    case 'get_position_rankings':
      return getPositionRankings(args, orgId, locationId);

    case 'get_pillar_scores':
      return getPillarScores(args, orgId, locationId);

    case 'get_org_chart':
      return getOrgChart(args, orgId, locationId);
    case 'get_schedule_overview':
      return getScheduleOverview(args, orgId, locationId);
    case 'get_employee_schedule':
      return getEmployeeSchedule(args, orgId, locationId);
    case 'get_labor_summary':
      return getLaborSummary(args, orgId, locationId);
    case 'get_evaluation_status':
      return getEvaluationStatus(args, orgId, locationId);

    case 'get_rating_activity':
      return getRatingActivity(args, orgId, locationId);

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── Tool Labels ──────────────────────────────────────────────────────────────

/**
 * Human-readable labels for tool calls, displayed in the mobile app UI.
 * Display tools return empty string (handled silently).
 */
export function getToolCallLabel(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'lookup_employee': {
      const q = input.name || input.query || '';
      return q ? `Looking up ${q}` : 'Looking up employee';
    }
    case 'list_employees':
      return 'Listing employees';
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
    case 'get_pillar_scores': {
      if (input.pillar) return `Checking ${input.pillar} scores`;
      return 'Loading OE pillar scores';
    }
    case 'get_org_chart':
      return 'Loading org chart';
    case 'get_schedule_overview':
      return 'Checking schedule';
    case 'get_employee_schedule': {
      const empName = input.employee_name || '';
      return empName ? `Checking ${empName}'s schedule` : 'Checking schedule';
    }
    case 'get_labor_summary':
      return 'Analyzing labor costs';
    case 'get_evaluation_status':
      return input.employee_id ? 'Checking evaluation history' : 'Loading evaluation overview';
    case 'get_rating_activity': {
      if (input.group_by === 'rater') return 'Checking rating submissions';
      if (input.group_by === 'day') return 'Checking daily rating activity';
      if (input.group_by === 'position') return 'Checking ratings by position';
      return 'Loading rating activity';
    }
    case 'show_employee_list':
    case 'show_employee_card':
      return ''; // Display tools — no label needed
    default:
      return `Running ${name.replace(/_/g, ' ')}`;
  }
}

// ─── Display Tool Builders ────────────────────────────────────────────────────

/**
 * Build display tools for the worker. These are the only tools the worker can call.
 */
export function buildDisplayTools(): ToolSet {
  return {
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

// ─── Full Tool Builder (Legacy Fallback) ──────────────────────────────────────

/**
 * Build all tools for the legacy single-model fallback path.
 * This is the same as the old buildTools() in chat.ts.
 */
export function buildAllTools(ctx: ToolRegistryContext): ToolSet {
  const { orgId, locationId, features } = ctx;

  const tools: ToolSet = {
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
    get_employee_profile: tool({
      description:
        'Get a comprehensive profile for ONE employee: details, recent ratings with trend, infractions, and discipline actions — all in one call. Requires employee_id (use lookup_employee first).',
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
        'Rank employees for a SINGLE position the user explicitly named (e.g. "who is the best host?"). NEVER call this tool more than once — if the user asks about ratings in general, trends, or overall performance, call get_team_overview instead.',
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
        'Get Operational Excellence pillar scores (Great Food, Quick & Accurate, Creating Moments, Caring Interactions, Inviting Atmosphere). Without employee_id: location-level scores + top/bottom performers. With employee_id: per-pillar scores with position breakdown and criteria mapping. Each pillar includes has_data (boolean) — pillars with has_data=false have no ratings and are excluded from the overall weighted average. The overall score only reflects pillars the employee has been rated in.',
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
        'Flexible ratings query tool. Use this to answer questions about rating activity, submission patterns, and detailed rating data. Supports multiple modes:\n' +
        '- group_by "rater": Who submitted the most/fewest ratings? → returns rater name, count, avg score given\n' +
        '- group_by "employee": Who received the most/fewest ratings? → returns employee name, count, avg score\n' +
        '- group_by "position": Which positions got rated the most? → returns position, count, avg score\n' +
        '- group_by "day": How many ratings per day? → returns date, count, avg score\n' +
        '- No group_by: Individual ratings with rater name, employee name, position, per-criteria scores, and notes\n\n' +
        'The rater is the leader/trainer who submitted the rating. The employee is the team member who was rated.\n' +
        'rating_1 through rating_5 map to position-specific criteria (e.g., for Fries: rating_1=Drop with Timing, rating_2=Fry & Finish Right, etc.). Set include_criteria=true to get criteria names in results.\n' +
        'Default date range is last 7 days. Use start_date/end_date for custom ranges.',
      inputSchema: z.object({
        group_by: z
          .enum(['rater', 'employee', 'position', 'day'])
          .optional()
          .describe('Group results by dimension. Omit for individual ratings.'),
        rater_id: z
          .string()
          .optional()
          .describe('Filter to ratings submitted by this employee_id (the rater). Use lookup_employee first to find the ID.'),
        employee_id: z
          .string()
          .optional()
          .describe('Filter to ratings received by this employee_id. Use lookup_employee first to find the ID.'),
        position: z
          .string()
          .optional()
          .describe('Filter to a specific position name (case-insensitive, e.g., "Fries", "iPOS")'),
        start_date: z
          .string()
          .optional()
          .describe('Start date YYYY-MM-DD (default: 7 days ago)'),
        end_date: z
          .string()
          .optional()
          .describe('End date YYYY-MM-DD (default: today)'),
        limit: z
          .number()
          .optional()
          .describe('Max results (default: 20, max: 50)'),
        sort: z
          .enum(['asc', 'desc'])
          .optional()
          .describe('Sort direction for count/date (default: desc = highest/newest first)'),
        include_criteria: z
          .boolean()
          .optional()
          .describe('Include position-specific criteria names for rating_1..5 in individual ratings (default: false)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getRatingActivity(input, orgId, locationId);
      },
    }),

    // New tools — org chart, schedule, evaluations
    ...(features?.orgChart
      ? {
          get_org_chart: tool({
            description:
              'Get the org chart tree: departments, groups (with members), supervisors, and direct reports for all employees. Shows hierarchy and reporting structure. Only available when org chart is configured.',
            inputSchema: z.object({}),
            execute: async () => {
              return await getOrgChart({}, orgId, locationId);
            },
          }),
        }
      : {}),
    get_schedule_overview: tool({
      description:
        'Get the schedule for a week: shift counts, assigned/unassigned shifts, total hours, daily coverage breakdown. Defaults to current week. Use for "how does the schedule look?" or "are we fully staffed?"',
      inputSchema: z.object({
        week_start: z
          .string()
          .optional()
          .describe('Start of week (YYYY-MM-DD, defaults to current Monday)'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getScheduleOverview(input, orgId, locationId);
      },
    }),
    get_employee_schedule: tool({
      description:
        'Get upcoming shifts for ONE specific employee. Requires employee_id (use lookup_employee first). Shows shift dates, times, positions, and total hours.',
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
        'Get labor cost breakdown for a week: total hours, total cost, FOH/BOH split, overtime alerts. Use for "what are labor costs?" or "who is in overtime?"',
      inputSchema: z.object({
        week_start: z
          .string()
          .optional()
          .describe('Start of week (YYYY-MM-DD, defaults to current Monday)'),
        zone: z
          .enum(['FOH', 'BOH'])
          .optional()
          .describe('Filter to front-of-house or back-of-house only'),
      }),
      execute: async (input: Record<string, unknown>) => {
        return await getLaborSummary(input, orgId, locationId);
      },
    }),
    ...(features?.evaluations
      ? {
          get_evaluation_status: tool({
            description:
              'Get evaluation status. Without employee_id: location-wide overview (upcoming, completed, by status, certification changes). With employee_id: individual evaluation history + certification audit trail.',
            inputSchema: z.object({
              employee_id: z
                .string()
                .optional()
                .describe('Optional UUID. Omit for location-wide overview.'),
            }),
            execute: async (input: Record<string, unknown>) => {
              return await getEvaluationStatus(input, orgId, locationId);
            },
          }),
        }
      : {}),

    // Display tools
    ...buildDisplayTools(),
  };

  return tools;
}
