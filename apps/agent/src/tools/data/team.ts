/**
 * Team Overview tool — location-level team snapshot with ratings + discipline.
 * Queries active employees, their position averages, and infraction data
 * to provide a comprehensive team overview.
 */

import { getServiceClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache.js';

/** Options that can be passed from the org context */
export interface TeamOverviewOptions {
  /** Whether the certifications feature is enabled */
  certificationsEnabled?: boolean;
}

/**
 * Get a location-level team overview snapshot.
 * Returns role breakdown, rating averages by position, attention items, and recent hires.
 */
export async function getTeamOverview(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string,
  options?: TeamOverviewOptions
): Promise<string> {
  const zone = args.zone as string | undefined;
  const cacheKey = `team:${locationId ?? 'org'}:${zone ?? 'all'}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.TEAM, () =>
    _getTeamOverview(orgId, locationId, zone, options)
  );
}

/** Internal: uncached team overview */
async function _getTeamOverview(
  orgId: string,
  locationId?: string,
  zone?: string,
  options?: TeamOverviewOptions
): Promise<string> {
  const supabase = getServiceClient();
  const showCerts = options?.certificationsEnabled ?? false;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Build employee query scoped to org + location
  // Always select all columns — we strip cert data from the output if the feature is disabled
  let empQuery = supabase
    .from('employees')
    .select('id, full_name, role, hire_date, certified_status, active, is_leader, is_trainer, is_boh, is_foh')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('full_name', { ascending: true });

  if (locationId) {
    empQuery = empQuery.eq('location_id', locationId);
  }
  if (zone?.toUpperCase() === 'FOH') {
    empQuery = empQuery.eq('is_foh', true);
  } else if (zone?.toUpperCase() === 'BOH') {
    empQuery = empQuery.eq('is_boh', true);
  }

  // Query infractions from last 90 days for discipline points
  let infQuery = supabase
    .from('infractions')
    .select('employee_id, points')
    .eq('org_id', orgId)
    .gte('infraction_date', ninetyDaysAgo);

  if (locationId) {
    infQuery = infQuery.eq('location_id', locationId);
  }

  // Query latest and ~30-days-ago position averages for trend comparison
  const latestDateQuery = supabase
    .from('daily_position_averages')
    .select('calculation_date')
    .eq('org_id', orgId)
    .order('calculation_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Find the closest calculation_date on or before 30 days ago
  const priorDateQuery = supabase
    .from('daily_position_averages')
    .select('calculation_date')
    .eq('org_id', orgId)
    .lte('calculation_date', thirtyDaysAgo)
    .order('calculation_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Run all in parallel
  const [empResult, infResult, latestDateResult, priorDateResult] = await Promise.all([
    empQuery,
    infQuery,
    latestDateQuery,
    priorDateQuery,
  ]);

  if (empResult.error) {
    return JSON.stringify({ error: empResult.error.message });
  }

  const employees = empResult.data;
  const infractions90d = infResult.data ?? [];

  if (!employees || employees.length === 0) {
    return JSON.stringify({
      message: 'No active employees found' + (locationId ? ' at this location' : ''),
    });
  }

  // ── Rating averages by position (current + 30-day trend) ──
  let positionAverages: Record<string, { avg: number; count: number; prior_avg?: number; change?: number }> = {};
  let topPerformers: Array<{ name: string; role: string; position: string; rating_avg: number }> = [];
  let bottomPerformers: Array<{ name: string; role: string; position: string; rating_avg: number }> = [];
  let ratingsAvailable = false;
  let ratingsSummary: Record<string, unknown> | undefined;

  if (latestDateResult.data?.calculation_date) {
    const latestDate = latestDateResult.data.calculation_date;
    const priorDate = priorDateResult?.data?.calculation_date;

    // Fetch current and (optionally) prior position averages in parallel
    let currentQuery = supabase
      .from('daily_position_averages')
      .select('employee_id, position_averages')
      .eq('org_id', orgId)
      .eq('calculation_date', latestDate);
    if (locationId) currentQuery = currentQuery.eq('location_id', locationId);

    let priorQueryPromise: PromiseLike<any> | null = null;
    if (priorDate && priorDate !== latestDate) {
      let pq = supabase
        .from('daily_position_averages')
        .select('employee_id, position_averages')
        .eq('org_id', orgId)
        .eq('calculation_date', priorDate);
      if (locationId) pq = pq.eq('location_id', locationId);
      priorQueryPromise = pq.then((r: any) => r);
    }

    const [currentResult, priorResult] = await Promise.all([
      currentQuery.then((r: any) => r),
      priorQueryPromise ?? Promise.resolve({ data: null }),
    ]);
    const avgData = currentResult?.data;
    const priorData = priorResult?.data;

    if (avgData && avgData.length > 0) {
      ratingsAvailable = true;
      const empMap = new Map(employees.map((e: any) => [e.id, e]));

      // Helper to compute position sums from a dataset
      const computePositionSums = (data: any[]) => {
        const sums: Record<string, { total: number; count: number }> = {};
        for (const row of data) {
          const avgs = row.position_averages as Record<string, number>;
          if (!avgs || Object.keys(avgs).length === 0) continue;
          const emp = empMap.get(row.employee_id);
          if (!emp) continue;
          if (zone?.toUpperCase() === 'FOH' && !(emp as any).is_foh) continue;
          if (zone?.toUpperCase() === 'BOH' && !(emp as any).is_boh) continue;
          for (const [pos, avg] of Object.entries(avgs)) {
            if (typeof avg !== 'number' || avg <= 0) continue;
            if (!sums[pos]) sums[pos] = { total: 0, count: 0 };
            sums[pos].total += avg;
            sums[pos].count += 1;
          }
        }
        return sums;
      };

      // Current position averages
      const currentSums = computePositionSums(avgData);
      for (const [pos, { total, count }] of Object.entries(currentSums)) {
        positionAverages[pos] = {
          avg: Math.round((total / count) * 100) / 100,
          count,
        };
      }

      // Prior position averages + compute change
      if (priorData && priorData.length > 0) {
        const priorSums = computePositionSums(priorData);
        for (const [pos, current] of Object.entries(positionAverages)) {
          const prior = priorSums[pos];
          if (prior) {
            const priorAvg = Math.round((prior.total / prior.count) * 100) / 100;
            current.prior_avg = priorAvg;
            current.change = Math.round((current.avg - priorAvg) * 100) / 100;
          }
        }
        ratingsSummary = {
          current_date: latestDate,
          comparison_date: priorDate,
          days_between: Math.round(
            (new Date(latestDate).getTime() - new Date(priorDate!).getTime()) / (1000 * 60 * 60 * 24)
          ),
        };
      }

      // Collect per-employee overalls for top/bottom performers
      const employeeOveralls: Array<{
        employee_id: string;
        name: string;
        role: string;
        positions: Record<string, number>;
        overall_avg: number;
      }> = [];

      for (const row of avgData) {
        const avgs = row.position_averages as Record<string, number>;
        if (!avgs || Object.keys(avgs).length === 0) continue;
        const emp = empMap.get(row.employee_id);
        if (!emp) continue;
        if (zone?.toUpperCase() === 'FOH' && !(emp as any).is_foh) continue;
        if (zone?.toUpperCase() === 'BOH' && !(emp as any).is_boh) continue;

        let empTotal = 0;
        let empCount = 0;
        for (const [, avg] of Object.entries(avgs)) {
          if (typeof avg !== 'number' || avg <= 0) continue;
          empTotal += avg;
          empCount += 1;
        }

        if (empCount > 0) {
          employeeOveralls.push({
            employee_id: row.employee_id,
            name: (emp as any).full_name,
            role: (emp as any).role,
            positions: avgs,
            overall_avg: Math.round((empTotal / empCount) * 100) / 100,
          });
        }
      }

      // Sort for top/bottom performers
      const sorted = employeeOveralls.sort((a, b) => b.overall_avg - a.overall_avg);

      topPerformers = sorted.slice(0, 5).map((e) => {
        const bestPos = Object.entries(e.positions).sort(([, a], [, b]) => b - a)[0];
        return { name: e.name, role: e.role, position: bestPos?.[0] || '', rating_avg: e.overall_avg };
      });

      bottomPerformers = sorted
        .slice(-5)
        .reverse()
        .map((e) => {
          const worstPos = Object.entries(e.positions).sort(([, a], [, b]) => a - b)[0];
          return { name: e.name, role: e.role, position: worstPos?.[0] || '', rating_avg: e.overall_avg };
        });
    }
  }

  // ── Discipline points per employee ──
  const pointsByEmployee = new Map<string, number>();
  for (const inf of infractions90d) {
    const empId = (inf as any).employee_id;
    pointsByEmployee.set(empId, (pointsByEmployee.get(empId) || 0) + ((inf as any).points ?? 0));
  }

  // ── Role breakdown ──
  const roleCounts: Record<string, number> = {};
  for (const emp of employees) {
    const role = emp.role || 'Unknown';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }

  // ── Zone split ──
  const fohCount = employees.filter((e: any) => e.is_foh).length;
  const bohCount = employees.filter((e: any) => e.is_boh).length;

  // ── Leader & trainer counts ──
  const leaderCount = employees.filter((e: any) => e.is_leader).length;
  const trainerCount = employees.filter((e: any) => e.is_trainer).length;

  // ── Attention items (discipline points ≥ 3) ──
  const attentionItems = employees
    .map((e: any) => ({
      name: e.full_name,
      role: e.role,
      current_points: pointsByEmployee.get(e.id) || 0,
    }))
    .filter((e: any) => e.current_points >= 3)
    .sort((a: any, b: any) => b.current_points - a.current_points)
    .slice(0, 10);

  // ── Recent hires (last 90 days) ──
  const recentHireFields = showCerts
    ? (e: any) => ({ name: e.full_name, role: e.role, hire_date: e.hire_date, certified_status: e.certified_status })
    : (e: any) => ({ name: e.full_name, role: e.role, hire_date: e.hire_date });

  const recentHires = employees
    .filter((e: any) => e.hire_date && e.hire_date >= ninetyDaysAgo)
    .map(recentHireFields);

  // ── Build response ──
  const result: Record<string, unknown> = {
    total_employees: employees.length,
    zone_filter: zone || 'all',
    roles: roleCounts,
    zones: { foh: fohCount, boh: bohCount },
    leadership: { leaders: leaderCount, trainers: trainerCount },
  };

  // Only include certifications if the feature is enabled
  if (showCerts) {
    const certifiedCount = employees.filter((e: any) => e.certified_status === 'Certified').length;
    const inTrainingCount = employees.filter((e: any) => e.certified_status === 'In Training').length;
    const notCertifiedCount = employees.filter((e: any) => !e.certified_status || e.certified_status === 'Not Certified').length;
    result.certifications = { certified: certifiedCount, in_training: inTrainingCount, not_certified: notCertifiedCount };
  }

  // Ratings section — only when data is available
  if (ratingsAvailable) {
    const ratingsData: Record<string, unknown> = {
      position_averages: positionAverages,
      top_performers: topPerformers,
      needs_improvement: bottomPerformers,
    };
    if (ratingsSummary) {
      ratingsData.trend = ratingsSummary;
    }
    result.ratings = ratingsData;
  }

  // Discipline section
  result.discipline = {
    employees_with_points: attentionItems.length,
    attention_items: attentionItems,
  };

  result.recent_hires = recentHires;

  return JSON.stringify(result);
}
