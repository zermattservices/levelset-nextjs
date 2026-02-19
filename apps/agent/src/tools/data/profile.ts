/**
 * Employee Profile tool — comprehensive one-shot employee profile.
 * Runs parallel queries for employee details, ratings, infractions, and discipline.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Get a comprehensive profile for a single employee.
 * Fetches employee record, recent ratings, infractions, and discipline actions in parallel.
 */
export async function getEmployeeProfile(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const employeeId = args.employee_id as string;

  // Run all queries in parallel
  const [employeeResult, ratingsResult, infractionsResult, discActionsResult] =
    await Promise.all([
      // 1. Employee details
      supabase
        .from('employees')
        .select(
          'id, full_name, first_name, last_name, role, hire_date, certified_status, last_points_total, active, is_leader, is_trainer, is_boh, is_foh, location_id, email, phone'
        )
        .eq('id', employeeId)
        .eq('org_id', orgId)
        .maybeSingle(),

      // 2. Last 10 ratings
      supabase
        .from('ratings')
        .select(
          'id, position, rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg, notes, created_at, rater_user_id'
        )
        .eq('employee_id', employeeId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),

      // 3. Infractions (last 90 days for active points, all for history)
      supabase
        .from('infractions')
        .select(
          'id, infraction, infraction_date, points, notes, leader_name, ack_bool'
        )
        .eq('employee_id', employeeId)
        .eq('org_id', orgId)
        .order('infraction_date', { ascending: false })
        .limit(15),

      // 4. Discipline actions
      supabase
        .from('disc_actions')
        .select('id, action, action_date, leader_name, employee_name, notes')
        .eq('employee_id', employeeId)
        .eq('org_id', orgId)
        .order('action_date', { ascending: false })
        .limit(5),
    ]);

  if (employeeResult.error || !employeeResult.data) {
    return JSON.stringify({
      error: employeeResult.error?.message || 'Employee not found',
    });
  }

  const employee = employeeResult.data;
  const ratings = ratingsResult.data ?? [];
  const infractions = infractionsResult.data ?? [];
  const discActions = discActionsResult.data ?? [];

  // Calculate 90-day active points
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const activeInfractions = infractions.filter(
    (inf: any) => inf.infraction_date >= ninetyDaysAgo
  );
  const activePoints = activeInfractions.reduce(
    (sum: number, inf: any) => sum + (inf.points ?? 0),
    0
  );

  // Calculate rating trend (last 5 vs previous 5)
  let ratingTrend = 'N/A';
  if (ratings.length >= 4) {
    const recent = ratings
      .slice(0, Math.min(5, Math.floor(ratings.length / 2)))
      .reduce((s: number, r: any) => s + (r.rating_avg ?? 0), 0);
    const recentCount = Math.min(5, Math.floor(ratings.length / 2));
    const older = ratings
      .slice(recentCount, recentCount * 2)
      .reduce((s: number, r: any) => s + (r.rating_avg ?? 0), 0);
    const recentAvg = recent / recentCount;
    const olderAvg = older / recentCount;
    if (recentAvg > olderAvg + 0.1) ratingTrend = 'improving';
    else if (recentAvg < olderAvg - 0.1) ratingTrend = 'declining';
    else ratingTrend = 'stable';
  }

  return JSON.stringify({
    employee,
    ratings: {
      count: ratings.length,
      latest: ratings.slice(0, 5),
      trend: ratingTrend,
      overall_avg:
        ratings.length > 0
          ? (
              ratings.reduce((s: number, r: any) => s + (r.rating_avg ?? 0), 0) /
              ratings.length
            ).toFixed(2)
          : null,
    },
    discipline: {
      active_points: activePoints,
      stored_points: employee.last_points_total ?? 0,
      recent_infractions: activeInfractions.length,
      total_infractions: infractions.length,
      infractions: infractions.slice(0, 5),
      disc_actions: discActions,
    },
  });
}
