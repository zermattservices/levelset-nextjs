/**
 * Org Context Loader — fetches organization configuration for the system prompt.
 *
 * Runs 6 parallel Supabase queries to load roles, positions, features,
 * thresholds, rubrics, and location info. Results are injected into the
 * system prompt so Levi can answer org-aware questions without tool calls.
 *
 * Total query time target: <100ms (parallel execution).
 * Token budget: ~200-400 tokens in the system prompt.
 */

import { createServiceClient } from '@levelset/supabase-client';

export interface OrgContext {
  orgId: string;
  locationId?: string;
  locationName: string;
  locationNumber?: string;
  roles: { role_name: string; hierarchy_level: number; is_leader: boolean; is_trainer: boolean }[];
  positions: { name: string; zone: string; criteria: string[] }[];
  features: { certifications: boolean; evaluations: boolean; pip: boolean; customRoles: boolean };
  ratingThresholds: { green: number; yellow: number } | null;
  infractionRubric: { action: string; points: number }[];
  disciplineRubric: { action: string; points_threshold: number }[];
  employeeCount: number;
}

/**
 * Load organization context for system prompt injection.
 * All queries run in parallel for minimal latency.
 */
export async function loadOrgContext(
  orgId: string,
  locationId?: string
): Promise<OrgContext> {
  const supabase = createServiceClient();

  // Run all queries in parallel
  const [
    rolesResult,
    positionsResult,
    featuresResult,
    thresholdsResult,
    infractionRubricResult,
    disciplineRubricResult,
    locationResult,
    employeeCountResult,
  ] = await Promise.all([
    // 1. Org roles (or location-specific role hierarchy)
    locationId
      ? supabase
          .from('location_role_hierarchy')
          .select('role_name, hierarchy_level, is_leader, is_trainer')
          .eq('location_id', locationId)
          .order('hierarchy_level', { ascending: false })
      : supabase
          .from('org_roles')
          .select('role_name, hierarchy_level, is_leader, is_trainer')
          .eq('org_id', orgId)
          .order('hierarchy_level', { ascending: false }),

    // 2. Org positions with criteria names
    supabase
      .from('org_positions')
      .select('name, zone, position_criteria(name)')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),

    // 3. Feature toggles
    supabase
      .from('org_feature_toggles')
      .select('enable_certified_status, enable_evaluations, enable_pip_logic, custom_roles')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle(),

    // 4. Rating thresholds (location-specific)
    locationId
      ? supabase
          .from('rating_thresholds')
          .select('green_threshold, yellow_threshold')
          .eq('location_id', locationId)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    // 5. Infraction rubric (location-specific or org-level)
    supabase
      .from('infractions_rubric')
      .select('action, points')
      .eq('org_id', orgId)
      .order('points', { ascending: false }),

    // 6. Discipline rubric (location-specific or org-level)
    supabase
      .from('disc_actions_rubric')
      .select('action, points_threshold')
      .eq('org_id', orgId)
      .order('points_threshold', { ascending: true }),

    // 7. Location info
    locationId
      ? supabase
          .from('locations')
          .select('name, location_number')
          .eq('id', locationId)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    // 8. Active employee count (scoped to location if provided)
    (() => {
      let q = supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('active', true);
      if (locationId) q = q.eq('location_id', locationId);
      return q;
    })(),
  ]);

  // Parse roles
  const roles = (rolesResult.data ?? []).map((r: any) => ({
    role_name: r.role_name as string,
    hierarchy_level: r.hierarchy_level as number,
    is_leader: r.is_leader as boolean,
    is_trainer: r.is_trainer as boolean,
  }));

  // Parse positions with criteria
  const positions = (positionsResult.data ?? []).map((p: any) => ({
    name: p.name as string,
    zone: (p.zone as string) || 'General',
    criteria: ((p.position_criteria ?? []) as { name: string }[]).map((c) => c.name),
  }));

  // Parse features
  const features = {
    certifications: featuresResult.data?.enable_certified_status ?? false,
    evaluations: featuresResult.data?.enable_evaluations ?? false,
    pip: featuresResult.data?.enable_pip_logic ?? false,
    customRoles: featuresResult.data?.custom_roles ?? false,
  };

  // Parse rating thresholds
  const ratingThresholds = thresholdsResult.data
    ? {
        green: (thresholdsResult.data as any).green_threshold as number,
        yellow: (thresholdsResult.data as any).yellow_threshold as number,
      }
    : null;

  // Parse infraction rubric
  const infractionRubric = (infractionRubricResult.data ?? []).map((r: any) => ({
    action: r.action as string,
    points: r.points as number,
  }));

  // Parse discipline rubric
  const disciplineRubric = (disciplineRubricResult.data ?? []).map((r: any) => ({
    action: r.action as string,
    points_threshold: r.points_threshold as number,
  }));

  // Location info
  const locationName = (locationResult.data as any)?.name ?? 'Unknown Location';
  const locationNumber = (locationResult.data as any)?.location_number ?? undefined;

  return {
    orgId,
    locationId,
    locationName,
    locationNumber,
    roles,
    positions,
    features,
    ratingThresholds,
    infractionRubric,
    disciplineRubric,
    employeeCount: employeeCountResult.count ?? 0,
  };
}
