/**
 * Discipline Summary tool — location-wide or individual discipline overview.
 * Provides infractions, discipline actions, and point thresholds.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Get a discipline summary for the location or a specific employee.
 * When employee_id is provided, returns detailed discipline history for that person.
 * When omitted, returns a location-wide discipline overview.
 */
export async function getDisciplineSummary(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const employeeId = args.employee_id as string | undefined;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // ── Individual employee discipline ──
  if (employeeId) {
    const [employeeResult, infractionsResult, discActionsResult, recommendedResult] =
      await Promise.all([
        // Employee details
        supabase
          .from('employees')
          .select('id, full_name, role, last_points_total, active')
          .eq('id', employeeId)
          .eq('org_id', orgId)
          .maybeSingle(),

        // All infractions
        supabase
          .from('infractions')
          .select('id, infraction, infraction_date, points, notes, leader_name, ack_bool')
          .eq('employee_id', employeeId)
          .eq('org_id', orgId)
          .order('infraction_date', { ascending: false })
          .limit(20),

        // Discipline actions taken
        supabase
          .from('disc_actions')
          .select('id, action, action_date, leader_name, employee_name, notes')
          .eq('employee_id', employeeId)
          .eq('org_id', orgId)
          .order('action_date', { ascending: false })
          .limit(10),

        // Recommended (pending) discipline actions
        supabase
          .from('recommended_disc_actions')
          .select('id, recommended_action, points_when_recommended, created_at, action_taken, action_taken_at')
          .eq('employee_id', employeeId)
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    if (employeeResult.error || !employeeResult.data) {
      return JSON.stringify({
        error: employeeResult.error?.message || 'Employee not found',
      });
    }

    const infractions = infractionsResult.data ?? [];
    const discActions = discActionsResult.data ?? [];
    const recommended = recommendedResult.data ?? [];

    // Active points (last 90 days)
    const activeInfractions = infractions.filter(
      (inf: any) => inf.infraction_date >= ninetyDaysAgo
    );
    const activePoints = activeInfractions.reduce(
      (sum: number, inf: any) => sum + (inf.points ?? 0),
      0
    );

    // Pending discipline actions
    const pendingActions = recommended.filter((r: any) => !r.action_taken);

    return JSON.stringify({
      employee: {
        name: employeeResult.data.full_name,
        role: employeeResult.data.role,
        stored_points: employeeResult.data.last_points_total ?? 0,
        active: employeeResult.data.active,
      },
      points: {
        active_90_day: activePoints,
        stored: employeeResult.data.last_points_total ?? 0,
      },
      infractions: {
        total: infractions.length,
        active_count: activeInfractions.length,
        recent: infractions.slice(0, 5),
      },
      discipline_actions: {
        total: discActions.length,
        recent: discActions.slice(0, 5),
      },
      pending_actions: pendingActions,
    });
  }

  // ── Location-wide discipline overview ──

  // Get all active employees with points
  let empQuery = supabase
    .from('employees')
    .select('id, full_name, role, last_points_total, is_leader')
    .eq('org_id', orgId)
    .eq('active', true);

  if (locationId) {
    empQuery = empQuery.eq('location_id', locationId);
  }

  // Get recent infractions across the location
  let infQuery = supabase
    .from('infractions')
    .select('id, employee_id, infraction, infraction_date, points')
    .eq('org_id', orgId)
    .gte('infraction_date', ninetyDaysAgo)
    .order('infraction_date', { ascending: false })
    .limit(50);

  if (locationId) {
    infQuery = infQuery.eq('location_id', locationId);
  }

  // Get recent discipline actions across the location
  let discQuery = supabase
    .from('disc_actions')
    .select('id, employee_id, action, action_date, employee_name')
    .eq('org_id', orgId)
    .order('action_date', { ascending: false })
    .limit(20);

  if (locationId) {
    discQuery = discQuery.eq('location_id', locationId);
  }

  const [empResult, infResult, discResult] = await Promise.all([
    empQuery,
    infQuery,
    discQuery,
  ]);

  const employees = empResult.data ?? [];
  const infractions = infResult.data ?? [];
  const discActions = discResult.data ?? [];

  // Employees with active points
  const employeesWithPoints = employees
    .filter((e: any) => (e.last_points_total ?? 0) > 0)
    .sort((a: any, b: any) => (b.last_points_total ?? 0) - (a.last_points_total ?? 0));

  // Infraction type breakdown
  const infractionTypes: Record<string, number> = {};
  for (const inf of infractions) {
    const type = (inf as any).infraction || 'Unknown';
    infractionTypes[type] = (infractionTypes[type] || 0) + 1;
  }

  // Total active points across team
  const totalActivePoints = employeesWithPoints.reduce(
    (sum: number, e: any) => sum + (e.last_points_total ?? 0),
    0
  );

  return JSON.stringify({
    overview: {
      total_employees: employees.length,
      employees_with_points: employeesWithPoints.length,
      total_active_points: totalActivePoints,
      infractions_last_90_days: infractions.length,
      discipline_actions_recent: discActions.length,
    },
    infraction_breakdown: infractionTypes,
    top_point_holders: employeesWithPoints.slice(0, 10).map((e: any) => ({
      name: e.full_name,
      role: e.role,
      points: e.last_points_total,
    })),
    recent_discipline_actions: discActions.slice(0, 5).map((d: any) => ({
      action: d.action,
      date: d.action_date,
      employee_name: d.employee_name,
    })),
  });
}
