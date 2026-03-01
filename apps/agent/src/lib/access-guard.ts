/**
 * Access Guard — determines data visibility for each user based on
 * their permissions, hierarchy level, and relationship to target employees.
 *
 * Access model:
 *   - Levelset Admin: sees everything (bypassed before calling these)
 *   - Regular users: scoped by permission key + hierarchy tier per category
 *   - Users can ALWAYS see their own data for any category
 *   - "direct_reports" scope uses org chart when configured, falls back to
 *     hierarchy level comparison at same location
 */

import { getServiceClient } from '@levelset/supabase-client';

// ─── Types ──────────────────────────────────────────────────────────────────

/** What set of employees the user can see data for in a given category */
export type DataScope = 'all_location' | 'direct_reports' | 'self';

/** Data categories that have different access rules */
export type DataCategory = 'ratings' | 'discipline' | 'evaluations' | 'pay';

// ─── Permission Keys (mirrored from dashboard P constants) ──────────────────

const PE_VIEW_DASHBOARD = 'positional_excellence.view_dashboard';
const DISC_VIEW_DASHBOARD = 'discipline.view_dashboard';
const ROSTER_MANAGE_PAY = 'roster.manage_pay';

// ─── Constants ──────────────────────────────────────────────────────────────

export const ACCESS_DENIED_MSG = "You don't have access to this data.";
export const FILTERED_INDICATOR = '(Showing results filtered to your access level)';

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Determine the data scope for a category based on permissions and hierarchy.
 *
 * Returns:
 *   - 'all_location': user can see all employees at their location
 *   - 'direct_reports': user can see their direct reports + self
 *   - 'self': user can only see their own data
 *
 * For 'pay' category, returns null if user has no access at all (not even self).
 */
export function getDataScope(
  category: DataCategory,
  permissions: Set<string>,
  hierarchyLevel: number,
  features?: { evaluations?: boolean }
): DataScope | null {
  switch (category) {
    case 'ratings':
      // PE_VIEW_DASHBOARD → all tiers see all_location
      return permissions.has(PE_VIEW_DASHBOARD) ? 'all_location' : 'self';

    case 'discipline':
      if (!permissions.has(DISC_VIEW_DASHBOARD)) return 'self';
      // Tier 0-1 (Operator, Executive): all at location
      // Tier 2-3 (Director, Team Lead): direct reports only
      return hierarchyLevel <= 1 ? 'all_location' : 'direct_reports';

    case 'evaluations':
      if (!features?.evaluations) return 'self';
      // Tier 0-1: all_location, Tier 2: direct_reports, Tier 3+: self
      if (hierarchyLevel <= 1) return 'all_location';
      if (hierarchyLevel === 2) return 'direct_reports';
      return 'self';

    case 'pay':
      // Pay is fully gated — no self access without permission
      return permissions.has(ROSTER_MANAGE_PAY) ? 'all_location' : null;

    default:
      return 'self';
  }
}

/**
 * Resolve the set of employee IDs a user can see for a given scope.
 *
 * Returns:
 *   - null if scope is 'all_location' (no filtering needed)
 *   - string[] of accessible employee IDs for 'self' or 'direct_reports'
 */
export async function resolveAccessibleEmployeeIds(
  scope: DataScope,
  employeeId: string | undefined,
  orgId: string,
  locationId: string | undefined,
  hierarchyLevel: number
): Promise<string[] | null> {
  if (scope === 'all_location') return null;
  if (scope === 'self') return employeeId ? [employeeId] : [];

  // scope === 'direct_reports'
  if (!employeeId) return [];

  const directReports = await getDirectReportIds(employeeId, orgId, locationId, hierarchyLevel);
  // Always include self
  const ids = new Set(directReports);
  ids.add(employeeId);
  return Array.from(ids);
}

/**
 * Check if a specific target employee is accessible to the caller.
 * Self-access is always allowed regardless of scope.
 */
export async function verifyEmployeeAccess(
  targetEmployeeId: string,
  scope: DataScope,
  callerEmployeeId: string | undefined,
  orgId: string,
  locationId: string | undefined,
  hierarchyLevel: number
): Promise<boolean> {
  // Self is always accessible
  if (callerEmployeeId && targetEmployeeId === callerEmployeeId) return true;

  if (scope === 'all_location') return true;
  if (scope === 'self') return false; // not self (checked above), so no access

  // scope === 'direct_reports'
  const accessibleIds = await resolveAccessibleEmployeeIds(
    scope,
    callerEmployeeId,
    orgId,
    locationId,
    hierarchyLevel
  );
  return accessibleIds !== null && accessibleIds.includes(targetEmployeeId);
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Get direct report employee IDs. Uses org chart (direct_supervisor_id) first,
 * falls back to hierarchy level comparison at the same location.
 */
async function getDirectReportIds(
  supervisorEmployeeId: string,
  orgId: string,
  locationId: string | undefined,
  supervisorHierarchyLevel: number
): Promise<string[]> {
  const supabase = getServiceClient();

  // Strategy 1: Org chart — employees where direct_supervisor_id = this employee
  const { data: directReports } = await supabase
    .from('employees')
    .select('id')
    .eq('org_id', orgId)
    .eq('direct_supervisor_id', supervisorEmployeeId)
    .eq('active', true);

  if (directReports && directReports.length > 0) {
    return directReports.map((r) => r.id);
  }

  // Strategy 2: Group-based — if supervisor is in a group, find employees
  // whose supervisor_group_id matches any group the supervisor belongs to
  const { data: supervisorGroups } = await supabase
    .from('org_group_members')
    .select('org_group_id')
    .eq('employee_id', supervisorEmployeeId)
    .eq('org_id', orgId);

  if (supervisorGroups && supervisorGroups.length > 0) {
    const groupIds = supervisorGroups.map((g) => g.org_group_id);
    const { data: groupReports } = await supabase
      .from('employees')
      .select('id')
      .eq('org_id', orgId)
      .in('supervisor_group_id', groupIds)
      .eq('active', true);

    if (groupReports && groupReports.length > 0) {
      return groupReports.map((r) => r.id);
    }
  }

  // Strategy 3: Hierarchy fallback — employees at the same location with
  // a higher hierarchy_level number (lower in the org) than the supervisor
  if (!locationId) return [];

  const { data: lowerEmployees } = await supabase
    .from('employees')
    .select('id, role')
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .eq('active', true)
    .neq('id', supervisorEmployeeId);

  if (!lowerEmployees || lowerEmployees.length === 0) return [];

  // Look up hierarchy levels for all roles at this org
  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('role_name, hierarchy_level')
    .eq('org_id', orgId);

  if (!orgRoles) return [];

  const roleLevelMap = new Map(orgRoles.map((r) => [r.role_name, r.hierarchy_level]));

  return lowerEmployees
    .filter((emp) => {
      const empLevel = roleLevelMap.get(emp.role) ?? 999;
      return empLevel > supervisorHierarchyLevel;
    })
    .map((emp) => emp.id);
}
