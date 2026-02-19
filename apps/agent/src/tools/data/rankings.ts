/**
 * Rankings tool — get employees ranked by position rating average.
 * Uses daily_position_averages (JSONB) for efficient bulk queries.
 * Falls back to aggregating from the ratings table if no daily averages exist.
 *
 * All queries are scoped by org_id (and optionally location_id) from auth context.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Get employees ranked by their average rating for a specific position.
 * Returns a sorted list with employee name, role, and position average.
 */
export async function getPositionRankings(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const position = args.position as string;
  const limit = Math.min((args.limit as number) || 10, 50);
  const sort = (args.sort as string) || 'best';
  const ascending = sort === 'worst';

  // Try daily_position_averages first (most efficient — JSONB extraction)
  const latestDateResult = await supabase
    .from('daily_position_averages')
    .select('calculation_date')
    .eq('org_id', orgId)
    .order('calculation_date', { ascending: false })
    .limit(1)
    .single();

  if (latestDateResult.data?.calculation_date) {
    const latestDate = latestDateResult.data.calculation_date;

    // Get all daily averages for that date, then filter/sort in JS
    // (Supabase JS client doesn't support JSONB key extraction + ordering natively)
    let query = supabase
      .from('daily_position_averages')
      .select('employee_id, position_averages')
      .eq('org_id', orgId)
      .eq('calculation_date', latestDate);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: avgData, error: avgError } = await query;

    if (avgError) {
      return JSON.stringify({ error: avgError.message });
    }

    if (!avgData || avgData.length === 0) {
      return JSON.stringify({ message: `No rating data found for position "${position}".` });
    }

    // Extract employees who have a rating for this position (case-insensitive match)
    const positionKey = Object.keys(avgData[0]?.position_averages || {}).find(
      (k) => k.toLowerCase() === position.toLowerCase()
    );

    // Search all rows for the actual key name
    let matchedKey = positionKey;
    if (!matchedKey) {
      for (const row of avgData) {
        const avgs = row.position_averages as Record<string, number>;
        const found = Object.keys(avgs).find(
          (k) => k.toLowerCase() === position.toLowerCase()
        );
        if (found) {
          matchedKey = found;
          break;
        }
      }
    }

    if (!matchedKey) {
      return JSON.stringify({ message: `No employees found with ratings for "${position}".` });
    }

    const ranked = avgData
      .filter((row) => {
        const avgs = row.position_averages as Record<string, number>;
        return avgs[matchedKey!] !== undefined && avgs[matchedKey!] !== null;
      })
      .map((row) => ({
        employee_id: row.employee_id,
        rating_avg: Math.round(((row.position_averages as Record<string, number>)[matchedKey!]) * 100) / 100,
      }))
      .sort((a, b) => ascending ? a.rating_avg - b.rating_avg : b.rating_avg - a.rating_avg)
      .slice(0, limit);

    if (ranked.length === 0) {
      return JSON.stringify({ message: `No employees found with ratings for "${position}".` });
    }

    // Fetch employee details for the ranked IDs
    const employeeIds = ranked.map((r) => r.employee_id);
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, role, is_leader, is_trainer, certified_status, active')
      .in('id', employeeIds)
      .eq('active', true);

    if (empError) {
      return JSON.stringify({ error: empError.message });
    }

    const empMap = new Map((employees || []).map((e) => [e.id, e]));

    const results = ranked
      .map((r, i) => {
        const emp = empMap.get(r.employee_id);
        if (!emp) return null;
        return {
          rank: i + 1,
          employee_id: r.employee_id,
          full_name: emp.full_name,
          role: emp.role,
          position: matchedKey,
          rating_avg: r.rating_avg,
          is_leader: emp.is_leader,
          is_trainer: emp.is_trainer,
          certified_status: emp.certified_status,
        };
      })
      .filter(Boolean);

    return JSON.stringify({
      position: matchedKey,
      sort,
      count: results.length,
      calculation_date: latestDate,
      rankings: results,
    });
  }

  // Fallback: aggregate from ratings table directly
  // Use RPC or raw query since Supabase JS can't do GROUP BY + AVG
  const { data: fallbackData, error: fallbackError } = await supabase.rpc(
    'get_position_rankings' as any,
    {
      p_org_id: orgId,
      p_location_id: locationId || null,
      p_position: position,
      p_limit: limit,
      p_ascending: ascending,
    }
  );

  // If no RPC exists, do a simpler query
  if (fallbackError) {
    // Manual aggregation: get all ratings for this position, group in JS
    let ratingsQuery = supabase
      .from('ratings')
      .select('employee_id, rating_avg')
      .eq('org_id', orgId)
      .ilike('position', position);

    if (locationId) {
      ratingsQuery = ratingsQuery.eq('location_id', locationId);
    }

    const { data: ratings, error: ratingsError } = await ratingsQuery;

    if (ratingsError) {
      return JSON.stringify({ error: ratingsError.message });
    }

    if (!ratings || ratings.length === 0) {
      return JSON.stringify({ message: `No ratings found for position "${position}".` });
    }

    // Group by employee and average
    const byEmployee = new Map<string, { sum: number; count: number }>();
    for (const r of ratings) {
      const existing = byEmployee.get(r.employee_id) || { sum: 0, count: 0 };
      existing.sum += r.rating_avg;
      existing.count += 1;
      byEmployee.set(r.employee_id, existing);
    }

    const sorted = Array.from(byEmployee.entries())
      .map(([empId, { sum, count }]) => ({
        employee_id: empId,
        rating_avg: Math.round((sum / count) * 100) / 100,
        rating_count: count,
      }))
      .sort((a, b) => ascending ? a.rating_avg - b.rating_avg : b.rating_avg - a.rating_avg)
      .slice(0, limit);

    // Fetch employee details
    const ids = sorted.map((r) => r.employee_id);
    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name, role, is_leader, is_trainer, certified_status, active')
      .in('id', ids)
      .eq('active', true);

    const empLookup = new Map((emps || []).map((e) => [e.id, e]));

    const results = sorted
      .map((r, i) => {
        const emp = empLookup.get(r.employee_id);
        if (!emp) return null;
        return {
          rank: i + 1,
          employee_id: r.employee_id,
          full_name: emp.full_name,
          role: emp.role,
          position,
          rating_avg: r.rating_avg,
          rating_count: r.rating_count,
          is_leader: emp.is_leader,
          is_trainer: emp.is_trainer,
          certified_status: emp.certified_status,
        };
      })
      .filter(Boolean);

    return JSON.stringify({
      position,
      sort,
      count: results.length,
      source: 'ratings_aggregate',
      rankings: results,
    });
  }

  return JSON.stringify(fallbackData);
}
