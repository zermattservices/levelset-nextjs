/**
 * Team Overview tool — location-level team snapshot.
 * Queries all active employees with role/certification/points data
 * and provides a structured overview of the team.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Get a location-level team overview snapshot.
 * Returns role breakdown, zone split, certification stats,
 * attention items (high points), and top performers (certified).
 */
export async function getTeamOverview(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const zone = args.zone as string | undefined; // "FOH" or "BOH"

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Build employee query scoped to org + location
  let empQuery = supabase
    .from('employees')
    .select(
      'id, full_name, role, hire_date, certified_status, active, is_leader, is_trainer, is_boh, is_foh'
    )
    .eq('org_id', orgId)
    .eq('active', true)
    .order('full_name', { ascending: true });

  if (locationId) {
    empQuery = empQuery.eq('location_id', locationId);
  }

  // Apply zone filter if specified
  if (zone?.toUpperCase() === 'FOH') {
    empQuery = empQuery.eq('is_foh', true);
  } else if (zone?.toUpperCase() === 'BOH') {
    empQuery = empQuery.eq('is_boh', true);
  }

  // Query infractions from last 90 days to calculate current points
  let infQuery = supabase
    .from('infractions')
    .select('employee_id, points')
    .eq('org_id', orgId)
    .gte('infraction_date', ninetyDaysAgo);

  if (locationId) {
    infQuery = infQuery.eq('location_id', locationId);
  }

  const [empResult, infResult] = await Promise.all([empQuery, infQuery]);

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

  // Calculate current points per employee from infractions
  const pointsByEmployee = new Map<string, number>();
  for (const inf of infractions90d) {
    const empId = (inf as any).employee_id;
    pointsByEmployee.set(empId, (pointsByEmployee.get(empId) || 0) + ((inf as any).points ?? 0));
  }

  // Role breakdown
  const roleCounts: Record<string, number> = {};
  for (const emp of employees) {
    const role = emp.role || 'Unknown';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }

  // Zone split
  const fohCount = employees.filter((e: any) => e.is_foh).length;
  const bohCount = employees.filter((e: any) => e.is_boh).length;
  const bothCount = employees.filter((e: any) => e.is_foh && e.is_boh).length;

  // Certification stats
  const certifiedCount = employees.filter(
    (e: any) => e.certified_status === 'Certified'
  ).length;
  const inTrainingCount = employees.filter(
    (e: any) => e.certified_status === 'In Training'
  ).length;
  const notCertifiedCount = employees.filter(
    (e: any) => !e.certified_status || e.certified_status === 'Not Certified'
  ).length;

  // Leader & trainer counts
  const leaderCount = employees.filter((e: any) => e.is_leader).length;
  const trainerCount = employees.filter((e: any) => e.is_trainer).length;

  // Attention items — employees with high current discipline points (90-day cutoff)
  const attentionItems = employees
    .map((e: any) => ({
      name: e.full_name,
      role: e.role,
      current_points: pointsByEmployee.get(e.id) || 0,
    }))
    .filter((e: any) => e.current_points >= 3)
    .sort((a: any, b: any) => b.current_points - a.current_points)
    .slice(0, 10);

  // Recent hires (last 90 days)
  const recentHires = employees
    .filter((e: any) => e.hire_date && e.hire_date >= ninetyDaysAgo)
    .map((e: any) => ({
      name: e.full_name,
      role: e.role,
      hire_date: e.hire_date,
      certified_status: e.certified_status,
    }));

  return JSON.stringify({
    total_employees: employees.length,
    zone_filter: zone || 'all',
    roles: roleCounts,
    zones: {
      foh: fohCount,
      boh: bohCount,
      both: bothCount,
    },
    leadership: {
      leaders: leaderCount,
      trainers: trainerCount,
    },
    certifications: {
      certified: certifiedCount,
      in_training: inTrainingCount,
      not_certified: notCertifiedCount,
    },
    attention_items: attentionItems,
    recent_hires: recentHires,
  });
}
