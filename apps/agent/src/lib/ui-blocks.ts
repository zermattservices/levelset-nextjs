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
 */
export function toolResultToUIBlocks(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutput: string
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
        return employeeProfileBlocks(data);
      case 'get_position_rankings':
        return positionRankingsBlocks(data);
      case 'get_team_overview':
        return teamOverviewBlocks(data);
      case 'get_discipline_summary':
        return disciplineSummaryBlocks(data);
      default:
        return [];
    }
  } catch {
    return [];
  }
}

/* ── Individual mappers ──────────────────────────────── */

function lookupEmployeeBlocks(data: any[]): UIBlock[] {
  if (!Array.isArray(data)) return [];
  return data.slice(0, 5).map((emp) => ({
    blockType: 'employee-card' as const,
    blockId: `emp-${emp.id}`,
    payload: {
      employee_id: emp.id,
      name: emp.full_name,
      role: emp.role,
      hire_date: emp.hire_date,
      certified_status: emp.certified_status,
      active_points: emp.last_points_total,
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

function employeeRatingsBlocks(data: any, toolInput: Record<string, unknown>): UIBlock[] {
  const ratings = data.ratings;
  if (!Array.isArray(ratings) || ratings.length === 0) return [];

  // Group ratings by position and compute averages
  const byPosition = new Map<string, { sum: number; count: number }>();
  for (const r of ratings) {
    const pos = r.position;
    const existing = byPosition.get(pos) || { sum: 0, count: 0 };
    existing.sum += r.rating_avg;
    existing.count += 1;
    byPosition.set(pos, existing);
  }

  return Array.from(byPosition.entries()).map(([position, { sum, count }]) => ({
    blockType: 'rating-summary' as const,
    blockId: `rating-${toolInput.employee_id}-${position}`,
    payload: {
      employee_id: toolInput.employee_id,
      employee_name: '', // Not available from ratings tool alone
      position,
      rating_avg: Math.round((sum / count) * 100) / 100,
      rating_count: count,
    },
  }));
}

function employeeInfractionsBlocks(data: any): UIBlock[] {
  const infractions = data.infractions;
  if (!Array.isArray(infractions) || infractions.length === 0) return [];

  return infractions.slice(0, 5).map((inf: any) => ({
    blockType: 'infraction-card' as const,
    blockId: `inf-${inf.id}`,
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

function employeeProfileBlocks(data: any): UIBlock[] {
  const blocks: UIBlock[] = [];

  // Employee card
  if (data.employee) {
    blocks.push({
      blockType: 'employee-card',
      blockId: `emp-${data.employee.id}`,
      payload: {
        employee_id: data.employee.id,
        name: data.employee.full_name,
        role: data.employee.role,
        hire_date: data.employee.hire_date,
        certified_status: data.employee.certified_status,
        active_points: data.discipline?.active_points,
        is_leader: data.employee.is_leader,
        is_trainer: data.employee.is_trainer,
        rating_avg: data.ratings?.overall_avg ? parseFloat(data.ratings.overall_avg) : undefined,
      },
    });
  }

  // Rating summaries per position
  if (data.ratings?.latest && Array.isArray(data.ratings.latest)) {
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

  // Infraction cards
  if (data.discipline?.infractions && Array.isArray(data.discipline.infractions)) {
    for (const inf of data.discipline.infractions.slice(0, 3)) {
      blocks.push({
        blockType: 'infraction-card',
        blockId: `inf-${inf.id}`,
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

  // Discipline action cards
  if (data.discipline?.disc_actions && Array.isArray(data.discipline.disc_actions)) {
    for (const da of data.discipline.disc_actions.slice(0, 3)) {
      blocks.push({
        blockType: 'disc-action-card',
        blockId: `da-${da.id}`,
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

function teamOverviewBlocks(data: any): UIBlock[] {
  const blocks: UIBlock[] = [];

  // Attention items as employee list
  if (data.attention_items && data.attention_items.length > 0) {
    blocks.push({
      blockType: 'employee-list',
      blockId: `attention-${Date.now()}`,
      payload: {
        title: 'Needs Attention',
        employees: data.attention_items.map((item: any, i: number) => ({
          employee_id: '', // Not available from team overview
          name: item.name,
          role: item.role,
          rank: i + 1,
          metric_label: 'Points',
          metric_value: item.points,
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
        blockId: `inf-${inf.id}`,
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
        blockId: `da-${da.id}`,
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
    for (const da of data.recent_discipline_actions.slice(0, 5)) {
      blocks.push({
        blockType: 'disc-action-card',
        blockId: `da-loc-${Date.now()}-${da.action}`,
        payload: {
          id: '',
          action: da.action,
          date: da.date,
          employee_name: da.employee_name || '',
        },
      });
    }
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
          metric_value: item.points,
        })),
      },
    });
  }

  return blocks;
}
