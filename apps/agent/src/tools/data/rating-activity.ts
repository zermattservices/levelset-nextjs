/**
 * Rating Activity tool — flexible ratings query for Levi.
 *
 * Answers questions the other tools can't:
 *   - "Who submitted the most ratings last week?"
 *   - "Show me all ratings submitted by Jarren this week"
 *   - "What positions got rated the most?"
 *   - "How many ratings were submitted each day last week?"
 *
 * Supports grouping by: rater, employee, position, day.
 * Supports filtering by: rater, employee, position, date range.
 *
 * Returns rating counts + averages with rater/employee names resolved.
 * Individual ratings include per-criteria scores (rating_1..5) with
 * criteria names so Levi can explain what each score means.
 */

import { getServiceClient } from '@levelset/supabase-client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RatingActivityArgs {
  /** Group results by this dimension. Default: none (returns individual ratings) */
  group_by?: 'rater' | 'employee' | 'position' | 'day';
  /** Filter to ratings submitted by this employee_id (the rater) */
  rater_id?: string;
  /** Filter to ratings received by this employee_id */
  employee_id?: string;
  /** Filter to a specific position name (case-insensitive) */
  position?: string;
  /** Start date YYYY-MM-DD (default: 7 days ago) */
  start_date?: string;
  /** End date YYYY-MM-DD (default: today) */
  end_date?: string;
  /** Max results to return (default: 20, max: 50) */
  limit?: number;
  /** Sort direction for the primary metric (default: desc) */
  sort?: 'asc' | 'desc';
  /** Include per-criteria breakdown with names in individual ratings (default: false) */
  include_criteria?: boolean;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function getRatingActivity(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const {
    group_by,
    rater_id,
    employee_id,
    position,
    start_date,
    end_date,
    limit: rawLimit,
    sort = 'desc',
    include_criteria = false,
  } = args as unknown as RatingActivityArgs;

  const limit = Math.min(rawLimit ?? 20, 50);
  const supabase = getServiceClient();

  // Default date range: last 7 days
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 7);
  const startStr = start_date || defaultStart.toISOString().split('T')[0];
  const endStr = end_date || now.toISOString().split('T')[0];

  // Build base query — always include position and timing
  let query = supabase
    .from('ratings')
    .select(
      'id, employee_id, rater_user_id, position, position_id, rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg, notes, created_at'
    )
    .eq('org_id', orgId)
    .gte('created_at', `${startStr}T00:00:00`)
    .lte('created_at', `${endStr}T23:59:59`)
    .order('created_at', { ascending: sort === 'asc' });

  if (locationId) query = query.eq('location_id', locationId);
  if (rater_id) query = query.eq('rater_user_id', rater_id);
  if (employee_id) query = query.eq('employee_id', employee_id);
  if (position) query = query.ilike('position', position);

  // For grouped queries we need all matching rows; for ungrouped, respect limit
  const fetchLimit = group_by ? 1000 : limit;
  query = query.limit(fetchLimit);

  const { data: ratings, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!ratings || ratings.length === 0) {
    return JSON.stringify({
      message: 'No ratings found for the specified filters.',
      filters: { start_date: startStr, end_date: endStr, rater_id, employee_id, position },
    });
  }

  // Collect all unique employee IDs we need to resolve names for
  const employeeIds = new Set<string>();
  for (const r of ratings) {
    employeeIds.add(r.employee_id);
    if (r.rater_user_id) employeeIds.add(r.rater_user_id);
  }

  // Fetch employee names in bulk
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, role')
    .in('id', Array.from(employeeIds));

  const empMap = new Map(
    (employees || []).map((e: any) => [e.id, { name: e.full_name, role: e.role }])
  );

  // Optionally load criteria names for the positions in the result set
  let criteriaMap: Map<string, string[]> | undefined;
  if (include_criteria && !group_by) {
    criteriaMap = await loadCriteriaNames(supabase, orgId, ratings);
  }

  // ── Grouped responses ──────────────────────────────────────────────────────

  if (group_by === 'rater') {
    return JSON.stringify(groupByRater(ratings, empMap, limit, sort));
  }

  if (group_by === 'employee') {
    return JSON.stringify(groupByEmployee(ratings, empMap, limit, sort));
  }

  if (group_by === 'position') {
    return JSON.stringify(groupByPosition(ratings, limit, sort));
  }

  if (group_by === 'day') {
    return JSON.stringify(groupByDay(ratings, sort));
  }

  // ── Individual ratings (no grouping) ───────────────────────────────────────

  const individual = ratings.slice(0, limit).map((r: any) => {
    const rater = empMap.get(r.rater_user_id);
    const employee = empMap.get(r.employee_id);

    const entry: Record<string, unknown> = {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: employee?.name ?? 'Unknown',
      employee_role: employee?.role,
      rater_id: r.rater_user_id,
      rater_name: rater?.name ?? 'Unknown',
      rater_role: rater?.role,
      position: r.position,
      rating_avg: parseFloat(Number(r.rating_avg).toFixed(2)),
      created_at: r.created_at,
    };

    // Include per-criteria scores
    const scores: Record<string, number | null> = {};
    const criteriaNames = criteriaMap?.get(r.position?.toLowerCase());
    for (let i = 1; i <= 5; i++) {
      const val = r[`rating_${i}`];
      if (val !== null && val !== undefined) {
        const label = criteriaNames?.[i - 1] || `criteria_${i}`;
        scores[label] = val;
      }
    }
    if (Object.keys(scores).length > 0) {
      entry.criteria_scores = scores;
    }

    if (r.notes) entry.notes = r.notes;

    return entry;
  });

  return JSON.stringify({
    count: individual.length,
    total_in_range: ratings.length,
    date_range: { start: startStr, end: endStr },
    ratings: individual,
  });
}

// ─── Grouping helpers ────────────────────────────────────────────────────────

function groupByRater(
  ratings: any[],
  empMap: Map<string, { name: string; role: string }>,
  limit: number,
  sort: string
) {
  const groups = new Map<string, { count: number; sumAvg: number }>();
  for (const r of ratings) {
    const key = r.rater_user_id;
    const existing = groups.get(key) || { count: 0, sumAvg: 0 };
    existing.count += 1;
    existing.sumAvg += Number(r.rating_avg) || 0;
    groups.set(key, existing);
  }

  const sorted = Array.from(groups.entries())
    .map(([raterId, { count, sumAvg }]) => {
      const rater = empMap.get(raterId);
      return {
        rater_id: raterId,
        rater_name: rater?.name ?? 'Unknown',
        rater_role: rater?.role,
        ratings_submitted: count,
        avg_score_given: parseFloat((sumAvg / count).toFixed(2)),
      };
    })
    .sort((a, b) =>
      sort === 'asc'
        ? a.ratings_submitted - b.ratings_submitted
        : b.ratings_submitted - a.ratings_submitted
    )
    .slice(0, limit);

  return {
    group_by: 'rater',
    total_ratings: ratings.length,
    unique_raters: groups.size,
    raters: sorted,
  };
}

function groupByEmployee(
  ratings: any[],
  empMap: Map<string, { name: string; role: string }>,
  limit: number,
  sort: string
) {
  const groups = new Map<string, { count: number; sumAvg: number }>();
  for (const r of ratings) {
    const key = r.employee_id;
    const existing = groups.get(key) || { count: 0, sumAvg: 0 };
    existing.count += 1;
    existing.sumAvg += Number(r.rating_avg) || 0;
    groups.set(key, existing);
  }

  const sorted = Array.from(groups.entries())
    .map(([empId, { count, sumAvg }]) => {
      const emp = empMap.get(empId);
      return {
        employee_id: empId,
        employee_name: emp?.name ?? 'Unknown',
        employee_role: emp?.role,
        ratings_received: count,
        avg_score: parseFloat((sumAvg / count).toFixed(2)),
      };
    })
    .sort((a, b) =>
      sort === 'asc'
        ? a.ratings_received - b.ratings_received
        : b.ratings_received - a.ratings_received
    )
    .slice(0, limit);

  return {
    group_by: 'employee',
    total_ratings: ratings.length,
    unique_employees: groups.size,
    employees: sorted,
  };
}

function groupByPosition(ratings: any[], limit: number, sort: string) {
  const groups = new Map<string, { count: number; sumAvg: number }>();
  for (const r of ratings) {
    const key = r.position || 'Unknown';
    const existing = groups.get(key) || { count: 0, sumAvg: 0 };
    existing.count += 1;
    existing.sumAvg += Number(r.rating_avg) || 0;
    groups.set(key, existing);
  }

  const sorted = Array.from(groups.entries())
    .map(([pos, { count, sumAvg }]) => ({
      position: pos,
      rating_count: count,
      avg_score: parseFloat((sumAvg / count).toFixed(2)),
    }))
    .sort((a, b) =>
      sort === 'asc' ? a.rating_count - b.rating_count : b.rating_count - a.rating_count
    )
    .slice(0, limit);

  return {
    group_by: 'position',
    total_ratings: ratings.length,
    unique_positions: groups.size,
    positions: sorted,
  };
}

function groupByDay(ratings: any[], sort: string) {
  const groups = new Map<string, { count: number; sumAvg: number }>();
  for (const r of ratings) {
    const day = (r.created_at as string).split('T')[0];
    const existing = groups.get(day) || { count: 0, sumAvg: 0 };
    existing.count += 1;
    existing.sumAvg += Number(r.rating_avg) || 0;
    groups.set(day, existing);
  }

  const sorted = Array.from(groups.entries())
    .map(([day, { count, sumAvg }]) => ({
      date: day,
      rating_count: count,
      avg_score: parseFloat((sumAvg / count).toFixed(2)),
    }))
    .sort((a, b) => (sort === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

  return {
    group_by: 'day',
    total_ratings: ratings.length,
    days: sorted,
  };
}

// ─── Criteria name loader ────────────────────────────────────────────────────

/**
 * Load position_criteria names for positions appearing in the result set.
 * Returns a map of lowercase position name → array of criteria names in order.
 */
async function loadCriteriaNames(
  supabase: any,
  orgId: string,
  ratings: any[]
): Promise<Map<string, string[]>> {
  const positionNames = [...new Set(ratings.map((r: any) => r.position as string).filter(Boolean))];

  if (positionNames.length === 0) return new Map();

  // Get org_positions for these names
  const { data: positions } = await supabase
    .from('org_positions')
    .select('id, name')
    .eq('org_id', orgId)
    .in('name', positionNames);

  if (!positions || positions.length === 0) return new Map();

  const posIds = positions.map((p: any) => p.id);

  // Get criteria for those positions
  const { data: criteria } = await supabase
    .from('position_criteria')
    .select('position_id, criteria_order, name')
    .in('position_id', posIds)
    .order('criteria_order', { ascending: true });

  if (!criteria) return new Map();

  // Build map: position name (lowercase) → ordered criteria names
  const posIdToName = new Map(positions.map((p: any) => [p.id, p.name.toLowerCase()]));
  const result = new Map<string, string[]>();

  for (const c of criteria as any[]) {
    const posName = posIdToName.get(c.position_id) as string | undefined;
    if (!posName) continue;
    if (!result.has(posName)) result.set(posName, [] as string[]);
    const arr = result.get(posName)!;
    // criteria_order is 1-based, map to 0-based index
    arr[c.criteria_order - 1] = c.name;
  }

  return result;
}
