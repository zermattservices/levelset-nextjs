/**
 * Org Chart tool — departments, groups, supervisors, and direct reports.
 *
 * Queries the org chart infrastructure (org_departments, org_groups,
 * org_group_members, employee supervisor relationships) to produce
 * a resolved tree. All UUIDs are resolved to human-readable names.
 *
 * Feature-gated: only available when orgChart feature is enabled.
 */

import { getServiceClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache.js';

/**
 * Get the org chart tree for a location.
 * Returns departments, groups with members, and employee hierarchy.
 */
export async function getOrgChart(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const cacheKey = `org_chart:${locationId ?? 'org'}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.TEAM, () =>
    _getOrgChart(orgId, locationId)
  );
}

/** Internal: uncached org chart query */
async function _getOrgChart(
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = getServiceClient();

  // Run all queries in parallel
  const [deptResult, groupResult, memberResult, empResult] = await Promise.all([
    // 1. Departments
    (() => {
      let q = supabase
        .from('org_departments')
        .select('id, name, department_head_id')
        .eq('org_id', orgId);
      if (locationId) q = q.eq('location_id', locationId);
      return q;
    })(),

    // 2. Groups (with supervisor group reference)
    (() => {
      let q = supabase
        .from('org_groups')
        .select('id, name, role_name, department_id, supervisor_group_id')
        .eq('org_id', orgId);
      if (locationId) q = q.eq('location_id', locationId);
      return q;
    })(),

    // 3. Group members
    supabase
      .from('org_group_members')
      .select('org_group_id, employee_id')
      .eq('org_id', orgId),

    // 4. Active employees with org chart columns
    (() => {
      let q = supabase
        .from('employees')
        .select(
          'id, full_name, role, title, is_foh, is_boh, is_leader, is_trainer, direct_supervisor_id, supervisor_group_id, department_id'
        )
        .eq('org_id', orgId)
        .eq('active', true)
        .order('full_name', { ascending: true });
      if (locationId) q = q.eq('location_id', locationId);
      return q;
    })(),
  ]);

  if (empResult.error) {
    return JSON.stringify({ error: empResult.error.message });
  }

  const departments = deptResult.data ?? [];
  const groups = groupResult.data ?? [];
  const members = memberResult.data ?? [];
  const employees = empResult.data ?? [];

  // Check if org chart is configured
  const hasOrgChart =
    departments.length > 0 ||
    groups.length > 0 ||
    employees.some(
      (e: any) => e.direct_supervisor_id || e.supervisor_group_id || e.department_id
    );

  if (!hasOrgChart) {
    return JSON.stringify({
      message: 'Org chart not configured for this location',
    });
  }

  // Build lookup maps
  const empById = new Map<string, any>();
  for (const e of employees) {
    empById.set(e.id, e);
  }

  const groupById = new Map<string, any>();
  for (const g of groups) {
    groupById.set(g.id, g);
  }

  const deptById = new Map<string, any>();
  for (const d of departments) {
    deptById.set(d.id, d);
  }

  // Build group membership: groupId → employee names
  const groupMembers = new Map<string, string[]>();
  for (const m of members) {
    const gId = (m as any).org_group_id;
    const eId = (m as any).employee_id;
    const emp = empById.get(eId);
    if (!emp) continue;
    if (!groupMembers.has(gId)) groupMembers.set(gId, []);
    groupMembers.get(gId)!.push(emp.full_name);
  }

  // Build direct reports: supervisorId → employee names
  const directReports = new Map<string, string[]>();
  for (const e of employees) {
    if (e.direct_supervisor_id) {
      if (!directReports.has(e.direct_supervisor_id)) {
        directReports.set(e.direct_supervisor_id, []);
      }
      directReports.get(e.direct_supervisor_id)!.push(e.full_name);
    }
  }

  // Format departments
  const formattedDepts = departments.map((d: any) => {
    const head = d.department_head_id ? empById.get(d.department_head_id) : null;
    return {
      name: d.name,
      head: head ? head.full_name : null,
    };
  });

  // Format groups
  const formattedGroups = groups.map((g: any) => {
    const dept = g.department_id ? deptById.get(g.department_id) : null;
    const supervisorGroup = g.supervisor_group_id
      ? groupById.get(g.supervisor_group_id)
      : null;
    return {
      name: g.name,
      role: g.role_name,
      department: dept ? dept.name : null,
      reports_to_group: supervisorGroup ? supervisorGroup.name : null,
      members: groupMembers.get(g.id) ?? [],
    };
  });

  // Determine zone label
  const getZone = (e: any): string => {
    if (e.is_foh && e.is_boh) return 'FOH/BOH';
    if (e.is_foh) return 'FOH';
    if (e.is_boh) return 'BOH';
    return '';
  };

  // Format employees — sort leaders first by role, then alphabetically
  const formattedEmployees = employees
    .sort((a: any, b: any) => {
      // Leaders first
      if (a.is_leader && !b.is_leader) return -1;
      if (!a.is_leader && b.is_leader) return 1;
      return a.full_name.localeCompare(b.full_name);
    })
    .map((e: any) => {
      const dept = e.department_id ? deptById.get(e.department_id) : null;
      const supervisorGroup = e.supervisor_group_id
        ? groupById.get(e.supervisor_group_id)
        : null;
      const directSupervisor = e.direct_supervisor_id
        ? empById.get(e.direct_supervisor_id)
        : null;

      // Find this employee's group
      let groupName: string | null = null;
      for (const [gId, memberNames] of groupMembers) {
        if (memberNames.includes(e.full_name)) {
          const g = groupById.get(gId);
          if (g) groupName = g.name;
          break;
        }
      }

      const emp: Record<string, unknown> = {
        name: e.full_name,
        role: e.role,
      };

      if (e.title) emp.title = e.title;
      if (dept) emp.department = dept.name;
      if (groupName) emp.group = groupName;

      // Supervisor — either direct or group
      if (directSupervisor) {
        emp.supervisor = directSupervisor.full_name;
      } else if (supervisorGroup) {
        emp.reports_to_group = supervisorGroup.name;
      }

      // Direct reports
      const reports = directReports.get(e.id);
      if (reports && reports.length > 0) {
        emp.direct_reports = reports;
      }

      const zone = getZone(e);
      if (zone) emp.zone = zone;

      return emp;
    });

  return JSON.stringify({
    departments: formattedDepts,
    groups: formattedGroups,
    employees: formattedEmployees,
  });
}
