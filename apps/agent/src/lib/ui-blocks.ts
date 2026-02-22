/**
 * UI Block mapper — transforms tool results into structured UI blocks
 * that the mobile app renders as rich card components.
 *
 * These blocks are emitted as `data-ui-block` SSE events during streaming,
 * separate from the LLM's text output. The mobile app renders them inline
 * in the chat as tappable cards with avatars, badges, and data.
 */

export interface UIBlock {
  blockType: 'employee-card' | 'employee-list' | 'rating-summary' | 'infraction-card' | 'disc-action-card';
  blockId: string;
  payload: Record<string, unknown>;
}

/**
 * Convert a tool's output into UI blocks for the mobile client.
 * Returns an empty array if no blocks should be shown.
 *
 * The optional `userMessage` parameter is the original user question, used
 * to avoid emitting irrelevant blocks (e.g. rating cards for a discipline
 * question). When omitted, all block types are emitted as a fallback.
 */
export function toolResultToUIBlocks(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutput: string,
  userMessage?: string
): UIBlock[] {
  try {
    const data = JSON.parse(toolOutput);

    // Skip error/empty results
    if (data.error || data.message) return [];

    switch (toolName) {
      case 'lookup_employee':
        return lookupEmployeeBlocks(data);
      case 'list_employees':
        return listEmployeesBlocks(data);
      case 'get_employee_ratings':
        return employeeRatingsBlocks(data, toolInput);
      case 'get_employee_infractions':
        return employeeInfractionsBlocks(data);
      case 'get_employee_profile':
        return employeeProfileBlocks(data, userMessage);
      case 'get_position_rankings':
        return positionRankingsBlocks(data);
      case 'get_team_overview':
        return teamOverviewBlocks(data, userMessage);
      case 'get_discipline_summary':
        return disciplineSummaryBlocks(data);
      default:
        return [];
    }
  } catch (err) {
    console.error(`[UIBlocks] Error generating blocks for ${toolName}:`, err);
    return [];
  }
}

/* ── Individual mappers ──────────────────────────────── */

function lookupEmployeeBlocks(data: any[]): UIBlock[] {
  if (!Array.isArray(data)) return [];
  return data.slice(0, 5).map((emp) => ({
    blockType: 'employee-card' as const,
    blockId: `lookup-emp-${emp.id}`,
    payload: {
      employee_id: emp.id,
      name: emp.full_name,
      role: emp.role,
      hire_date: emp.hire_date,
      certified_status: emp.certified_status,
      is_leader: emp.is_leader,
      is_trainer: emp.is_trainer,
    },
  }));
}

function listEmployeesBlocks(data: any): UIBlock[] {
  const employees = data.employees;
  if (!Array.isArray(employees) || employees.length === 0) return [];

  return [
    {
      blockType: 'employee-list' as const,
      blockId: `emp-list-${Date.now()}`,
      payload: {
        title: `${data.count} Employee${data.count !== 1 ? 's' : ''}`,
        employees: employees.slice(0, 20).map((emp: any, i: number) => ({
          employee_id: emp.id,
          name: emp.full_name,
          role: emp.role,
          rank: i + 1,
        })),
      },
    },
  ];
}

function employeeRatingsBlocks(_data: any, _toolInput: Record<string, unknown>): UIBlock[] {
  // Per-position rating-summary cards are noisy for individual employee lookups
  // (can produce 10+ cards per employee). The LLM's text analysis is more useful.
  // For rich employee UI, use get_employee_profile which generates a single
  // employee-card with overall average instead.
  return [];
}

function employeeInfractionsBlocks(data: any): UIBlock[] {
  const infractions = data.infractions;
  if (!Array.isArray(infractions) || infractions.length === 0) return [];

  return infractions.slice(0, 5).map((inf: any) => ({
    blockType: 'infraction-card' as const,
    blockId: `tool-inf-${inf.id}`,
    payload: {
      id: inf.id,
      employee_name: '', // Not available from infractions tool alone
      infraction: inf.infraction,
      date: inf.infraction_date,
      points: inf.points,
      leader_name: inf.leader_name,
    },
  }));
}

/**
 * Detect which data domains the user's question is about so we only emit
 * relevant UI blocks. Falls back to 'general' (employee card only) when
 * the intent is unclear.
 */
function detectQueryIntent(userMessage?: string): Set<'ratings' | 'discipline' | 'general'> {
  if (!userMessage) return new Set(['ratings', 'discipline', 'general']);

  const msg = userMessage.toLowerCase();
  const intents = new Set<'ratings' | 'discipline' | 'general'>();

  // Ratings keywords
  if (/\b(rat(e|ing|ings|ed)|score|rank|best|worst|top|bottom|average|avg|performance|position|eval)/i.test(msg)) {
    intents.add('ratings');
  }

  // Discipline keywords
  if (/\b(disciplin|infraction|point|write[- ]?up|warning|termina|fired|suspend|probation|pip|coach|counsel)/i.test(msg)) {
    intents.add('discipline');
  }

  // If nothing specific detected, just show the employee card
  if (intents.size === 0) {
    intents.add('general');
  }

  return intents;
}

function employeeProfileBlocks(data: any, userMessage?: string): UIBlock[] {
  const blocks: UIBlock[] = [];
  const intents = detectQueryIntent(userMessage);
  const showRatings = intents.has('ratings');
  const showDiscipline = intents.has('discipline');

  // Employee card — always shown (it's a compact summary)
  if (data.employee) {
    blocks.push({
      blockType: 'employee-card',
      blockId: `profile-emp-${data.employee.id}`,
      payload: {
        employee_id: data.employee.id,
        name: data.employee.full_name,
        role: data.employee.role,
        hire_date: data.employee.hire_date,
        certified_status: data.employee.certified_status,
        current_points: showDiscipline ? data.discipline?.current_points : undefined,
        is_leader: data.employee.is_leader,
        is_trainer: data.employee.is_trainer,
        rating_avg: showRatings && data.ratings?.overall_avg
          ? parseFloat(data.ratings.overall_avg)
          : undefined,
      },
    });
  }

  // Rating summaries per position — only when user asked about ratings
  if (showRatings && data.ratings?.latest && Array.isArray(data.ratings.latest)) {
    const byPosition = new Map<string, { sum: number; count: number }>();
    for (const r of data.ratings.latest) {
      const pos = r.position;
      const existing = byPosition.get(pos) || { sum: 0, count: 0 };
      existing.sum += r.rating_avg;
      existing.count += 1;
      byPosition.set(pos, existing);
    }

    for (const [position, { sum, count }] of byPosition) {
      blocks.push({
        blockType: 'rating-summary',
        blockId: `rating-${data.employee?.id}-${position}`,
        payload: {
          employee_id: data.employee?.id,
          employee_name: data.employee?.full_name || '',
          position,
          rating_avg: Math.round((sum / count) * 100) / 100,
          rating_count: count,
          trend: data.ratings.trend,
        },
      });
    }
  }

  // Infraction cards — only when user asked about discipline
  if (showDiscipline && data.discipline?.infractions && Array.isArray(data.discipline.infractions)) {
    for (const inf of data.discipline.infractions.slice(0, 3)) {
      blocks.push({
        blockType: 'infraction-card',
        blockId: `profile-inf-${inf.id}`,
        payload: {
          id: inf.id,
          employee_name: data.employee?.full_name || '',
          infraction: inf.infraction,
          date: inf.infraction_date,
          points: inf.points,
          leader_name: inf.leader_name,
        },
      });
    }
  }

  // Discipline action cards — only when user asked about discipline
  if (showDiscipline && data.discipline?.disc_actions && Array.isArray(data.discipline.disc_actions)) {
    for (const da of data.discipline.disc_actions.slice(0, 3)) {
      blocks.push({
        blockType: 'disc-action-card',
        blockId: `profile-da-${da.id}`,
        payload: {
          id: da.id,
          action: da.action,
          date: da.action_date,
          employee_name: data.employee?.full_name || '',
          leader_name: da.leader_name,
        },
      });
    }
  }

  return blocks;
}

function positionRankingsBlocks(data: any): UIBlock[] {
  const rankings = data.rankings;
  if (!Array.isArray(rankings) || rankings.length === 0) return [];

  return [
    {
      blockType: 'employee-list' as const,
      blockId: `ranking-${data.position}-${Date.now()}`,
      payload: {
        title: `Top ${data.position}${data.sort === 'worst' ? ' (Lowest)' : ''}`,
        employees: rankings.map((r: any) => ({
          employee_id: r.employee_id,
          name: r.full_name,
          role: r.role,
          rank: r.rank,
          metric_label: `${data.position} Avg`,
          metric_value: r.rating_avg,
        })),
      },
    },
  ];
}

function teamOverviewBlocks(data: any, userMessage?: string): UIBlock[] {
  const blocks: UIBlock[] = [];
  const intents = detectQueryIntent(userMessage);
  const showRatings = intents.has('ratings') || intents.has('general');
  const showDiscipline = intents.has('discipline') || intents.has('general');

  // Rating top performers — shown for ratings or general questions
  if (showRatings && data.ratings?.top_performers && data.ratings.top_performers.length > 0) {
    blocks.push({
      blockType: 'employee-list',
      blockId: `top-performers-${Date.now()}`,
      payload: {
        title: 'Top Performers',
        employees: data.ratings.top_performers.map((item: any, i: number) => ({
          employee_id: '',
          name: item.name,
          role: item.role,
          rank: i + 1,
          metric_label: 'Avg Rating',
          metric_value: item.rating_avg,
        })),
      },
    });
  }

  // Rating needs improvement — shown for ratings questions
  if (showRatings && data.ratings?.needs_improvement && data.ratings.needs_improvement.length > 0) {
    blocks.push({
      blockType: 'employee-list',
      blockId: `needs-improvement-${Date.now()}`,
      payload: {
        title: 'Needs Improvement',
        employees: data.ratings.needs_improvement.map((item: any, i: number) => ({
          employee_id: '',
          name: item.name,
          role: item.role,
          rank: i + 1,
          metric_label: 'Avg Rating',
          metric_value: item.rating_avg,
        })),
      },
    });
  }

  // Discipline attention items — shown for discipline or general questions
  if (showDiscipline && data.discipline?.attention_items && data.discipline.attention_items.length > 0) {
    blocks.push({
      blockType: 'employee-list',
      blockId: `attention-${Date.now()}`,
      payload: {
        title: 'Needs Attention',
        employees: data.discipline.attention_items.map((item: any, i: number) => ({
          employee_id: '',
          name: item.name,
          role: item.role,
          rank: i + 1,
          metric_label: 'Points',
          metric_value: item.current_points,
        })),
      },
    });
  }

  return blocks;
}

function disciplineSummaryBlocks(data: any): UIBlock[] {
  const blocks: UIBlock[] = [];

  // Individual employee infractions
  if (data.infractions?.recent && Array.isArray(data.infractions.recent)) {
    for (const inf of data.infractions.recent.slice(0, 5)) {
      blocks.push({
        blockType: 'infraction-card',
        blockId: `disc-inf-${inf.id}`,
        payload: {
          id: inf.id,
          employee_name: data.employee?.name || '',
          infraction: inf.infraction,
          date: inf.infraction_date,
          points: inf.points,
          leader_name: inf.leader_name,
        },
      });
    }
  }

  // Individual employee discipline actions
  if (data.discipline_actions?.recent && Array.isArray(data.discipline_actions.recent)) {
    for (const da of data.discipline_actions.recent.slice(0, 5)) {
      blocks.push({
        blockType: 'disc-action-card',
        blockId: `disc-da-${da.id}`,
        payload: {
          id: da.id,
          action: da.action,
          date: da.action_date,
          employee_name: da.employee_name || data.employee?.name || '',
          leader_name: da.leader_name,
        },
      });
    }
  }

  // Location-wide recent discipline actions
  if (data.recent_discipline_actions && Array.isArray(data.recent_discipline_actions)) {
    data.recent_discipline_actions.slice(0, 5).forEach((da: any, idx: number) => {
      blocks.push({
        blockType: 'disc-action-card',
        blockId: `loc-da-${idx}-${da.action}`,
        payload: {
          id: '',
          action: da.action,
          date: da.date,
          employee_name: da.employee_name || '',
        },
      });
    });
  }

  // Location-wide top point holders
  if (data.top_point_holders && data.top_point_holders.length > 0) {
    blocks.push({
      blockType: 'employee-list',
      blockId: `discipline-top-${Date.now()}`,
      payload: {
        title: 'Highest Points',
        employees: data.top_point_holders.map((item: any, i: number) => ({
          employee_id: '',
          name: item.name,
          role: item.role,
          rank: i + 1,
          metric_label: 'Points',
          metric_value: item.current_points,
        })),
      },
    });
  }

  return blocks;
}
