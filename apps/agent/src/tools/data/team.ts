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

  // Build employee query scoped to org + location
  let empQuery = supabase
    .from('employees')
    .select(
      'id, full_name, role, hire_date, certified_status, last_points_total, active, is_leader, is_trainer, is_boh, is_foh'
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

  const { data: employees, error } = await empQuery;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!employees || employees.length === 0) {
    return JSON.stringify({
      message: 'No active employees found' + (locationId ? ' at this location' : ''),
    });
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

  // Attention items — employees with high discipline points
  const attentionItems = employees
    .filter((e: any) => (e.last_points_total ?? 0) >= 3)
    .sort((a: any, b: any) => (b.last_points_total ?? 0) - (a.last_points_total ?? 0))
    .slice(0, 10)
    .map((e: any) => ({
      name: e.full_name,
      role: e.role,
      points: e.last_points_total,
    }));

  // Recent hires (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
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
