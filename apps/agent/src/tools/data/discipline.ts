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
          .select('id, full_name, role, active')
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

    // Current points (within the 90-day discipline cutoff)
    const currentInfractions = infractions.filter(
      (inf: any) => inf.infraction_date >= ninetyDaysAgo
    );
    const currentPoints = currentInfractions.reduce(
      (sum: number, inf: any) => sum + (inf.points ?? 0),
      0
    );

    // Archived points (older than the 90-day cutoff)
    const archivedInfractions = infractions.filter(
      (inf: any) => inf.infraction_date < ninetyDaysAgo
    );
    const archivedPoints = archivedInfractions.reduce(
      (sum: number, inf: any) => sum + (inf.points ?? 0),
      0
    );

    // Pending discipline actions
    const pendingActions = recommended.filter((r: any) => !r.action_taken);

    return JSON.stringify({
      employee: {
        name: employeeResult.data.full_name,
        role: employeeResult.data.role,
        active: employeeResult.data.active,
      },
      points: {
        current: currentPoints,
        archived: archivedPoints,
      },
      infractions: {
        total: infractions.length,
        current_count: currentInfractions.length,
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

  // Get all active employees
  let empQuery = supabase
    .from('employees')
    .select('id, full_name, role, is_leader')
    .eq('org_id', orgId)
    .eq('active', true);

  if (locationId) {
    empQuery = empQuery.eq('location_id', locationId);
  }

  // Get infractions from last 90 days (used for current points calculation)
  let infQuery = supabase
    .from('infractions')
    .select('id, employee_id, infraction, infraction_date, points')
    .eq('org_id', orgId)
    .gte('infraction_date', ninetyDaysAgo)
    .order('infraction_date', { ascending: false })
    .limit(200);

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

  // Calculate current points per employee from infractions (90-day cutoff)
  const pointsByEmployee = new Map<string, number>();
  for (const inf of infractions) {
    const empId = (inf as any).employee_id;
    pointsByEmployee.set(empId, (pointsByEmployee.get(empId) || 0) + ((inf as any).points ?? 0));
  }

  // Build ranked employee list with calculated current points
  const employeesWithPoints = employees
    .map((e: any) => ({
      ...e,
      current_points: pointsByEmployee.get(e.id) || 0,
    }))
    .filter((e: any) => e.current_points > 0)
    .sort((a: any, b: any) => b.current_points - a.current_points);

  // Infraction type breakdown
  const infractionTypes: Record<string, number> = {};
  for (const inf of infractions) {
    const type = (inf as any).infraction || 'Unknown';
    infractionTypes[type] = (infractionTypes[type] || 0) + 1;
  }

  // Total current points across team
  const totalCurrentPoints = employeesWithPoints.reduce(
    (sum: number, e: any) => sum + e.current_points,
    0
  );

  return JSON.stringify({
    overview: {
      total_employees: employees.length,
      employees_with_points: employeesWithPoints.length,
      total_current_points: totalCurrentPoints,
      infractions_last_90_days: infractions.length,
      discipline_actions_recent: discActions.length,
    },
    infraction_breakdown: infractionTypes,
    top_point_holders: employeesWithPoints.slice(0, 10).map((e: any) => ({
      name: e.full_name,
      role: e.role,
      current_points: e.current_points,
    })),
    recent_discipline_actions: discActions.slice(0, 5).map((d: any) => ({
      action: d.action,
      date: d.action_date,
      employee_name: d.employee_name,
    })),
  });
}
