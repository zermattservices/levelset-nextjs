import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions/service';
import { P } from '@/lib/permissions/constants';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();

  // Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser(
    req.headers.authorization?.replace('Bearer ', '') || ''
  );

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role, first_name, last_name, employee_id')
    .eq('auth_user_id', user.id)
    .order('created_at');

  const appUser = appUsers?.find((u: any) => u.role === 'Levelset Admin') || appUsers?.[0];
  const isLevelsetAdmin = appUser?.role === 'Levelset Admin';

  let orgId = appUser?.org_id;

  // Levelset Admin: always derive org_id from the selected location
  // so they can view any org's data through the location selector
  if (isLevelsetAdmin && req.query.location_id) {
    const { data: loc } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', req.query.location_id as string)
      .maybeSingle();
    if (loc?.org_id) {
      orgId = loc.org_id;
    }
  }

  if (!orgId) {
    return res.status(403).json({ error: 'No organization found' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, supabase, user.id, orgId, appUser.role, isLevelsetAdmin);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, supabase, user.id, orgId, appUser, isLevelsetAdmin);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---------------------------------------------------------------------------
// GET — fetch all org chart data
// ---------------------------------------------------------------------------
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  userId: string,
  orgId: string,
  userRole: string,
  isLevelsetAdmin: boolean
) {
  // Permission check
  if (!isLevelsetAdmin) {
    const allowed = await checkPermission(supabase, userId, orgId, P.OC_VIEW, userRole);
    if (!allowed) {
      return res.status(403).json({ error: 'Permission denied' });
    }
  }

  const { location_id, scope } = req.query;

  if (!location_id) {
    return res.status(400).json({ error: 'location_id is required' });
  }

  const locationId = location_id as string;
  const isOrgWide = scope === 'org';

  // Run 4 parallel queries
  const employeeSelect = `
    id, full_name, first_name, last_name, role, title,
    is_foh, is_boh, is_leader, is_trainer, certified_status,
    hire_date, calculated_pay, actual_pay, actual_pay_type,
    direct_supervisor_id, supervisor_group_id, department_id, active
  `;

  let employeeQuery = supabase
    .from('employees')
    .select(employeeSelect)
    .eq('org_id', orgId)
    .eq('active', true);

  if (!isOrgWide) {
    employeeQuery = employeeQuery.eq('location_id', locationId);
  }

  let deptQuery = supabase
    .from('org_departments')
    .select('*')
    .eq('org_id', orgId);

  if (!isOrgWide) {
    deptQuery = deptQuery.or(`location_id.eq.${locationId},location_id.is.null`);
  }

  let groupQuery = supabase
    .from('org_groups')
    .select('*')
    .eq('org_id', orgId);

  if (!isOrgWide) {
    groupQuery = groupQuery.or(`location_id.eq.${locationId},location_id.is.null`);
  }

  const rolesQuery = supabase
    .from('org_roles')
    .select('id, role_name, hierarchy_level, is_leader, is_trainer, color')
    .eq('org_id', orgId)
    .order('hierarchy_level', { ascending: true });

  const [employeesResult, deptsResult, groupsResult, rolesResult] = await Promise.all([
    employeeQuery,
    deptQuery,
    groupQuery,
    rolesQuery,
  ]);

  if (employeesResult.error) {
    return res.status(500).json({ error: employeesResult.error.message });
  }

  // Fetch group members for all groups
  const groupIds = (groupsResult.data || []).map((g: any) => g.id);
  let groupMembers: any[] = [];

  if (groupIds.length > 0) {
    const { data: members } = await supabase
      .from('org_group_members')
      .select('*')
      .eq('org_id', orgId)
      .in('org_group_id', groupIds);

    groupMembers = members || [];
  }

  // Combine groups with their members
  const groupsWithMembers = (groupsResult.data || []).map((group: any) => ({
    ...group,
    members: groupMembers.filter((m: any) => m.org_group_id === group.id),
  }));

  // Always include top-level employees from ALL locations
  // (e.g., Operators/Executives supervise every location)
  let allEmployees = [...(employeesResult.data || [])];

  if (!isOrgWide && (rolesResult.data?.length > 0 || true)) {
    let topRoleNames: string[] = [];

    if (rolesResult.data?.length > 0) {
      const minLevel = Math.min(
        ...rolesResult.data.map((r: any) => r.hierarchy_level)
      );
      topRoleNames = rolesResult.data
        .filter((r: any) => r.hierarchy_level === minLevel)
        .map((r: any) => r.role_name);
    } else {
      // Fallback when no org_roles configured
      topRoleNames = ['Operator', 'Owner/Operator'];
    }

    if (topRoleNames.length > 0) {
      const existingIds = new Set(allEmployees.map((e: any) => e.id));

      const { data: topEmps } = await supabase
        .from('employees')
        .select(employeeSelect)
        .eq('org_id', orgId)
        .eq('active', true)
        .in('role', topRoleNames);

      if (topEmps) {
        for (const e of topEmps) {
          if (!existingIds.has(e.id)) {
            allEmployees.push(e);
          }
        }
      }
    }
  }

  return res.status(200).json({
    employees: allEmployees,
    departments: deptsResult.data || [],
    groups: groupsWithMembers,
    roles: rolesResult.data || [],
  });
}

// ---------------------------------------------------------------------------
// POST — intent-based mutations
// ---------------------------------------------------------------------------
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  userId: string,
  orgId: string,
  appUser: any,
  isLevelsetAdmin: boolean
) {
  // Permission check
  if (!isLevelsetAdmin) {
    const allowed = await checkPermission(supabase, userId, orgId, P.OC_EDIT, appUser.role);
    if (!allowed) {
      return res.status(403).json({ error: 'Permission denied' });
    }
  }

  const { intent, ...payload } = req.body;

  if (!intent) {
    return res.status(400).json({ error: 'intent is required' });
  }

  // Get user's hierarchy level for scoping
  let userHierarchyLevel = isLevelsetAdmin ? -1 : 999;
  if (!isLevelsetAdmin && appUser.employee_id) {
    const { data: empData } = await supabase
      .from('employees')
      .select('role')
      .eq('id', appUser.employee_id)
      .maybeSingle();

    if (empData?.role) {
      const { data: roleData } = await supabase
        .from('org_roles')
        .select('hierarchy_level')
        .eq('org_id', orgId)
        .eq('role_name', empData.role)
        .maybeSingle();

      userHierarchyLevel = roleData?.hierarchy_level ?? 999;
    }
  }

  try {
    switch (intent) {
      case 'update_employee_title':
        return await updateEmployeeTitle(res, supabase, orgId, payload, userHierarchyLevel);
      case 'update_supervisor':
        return await updateSupervisor(res, supabase, orgId, payload, userHierarchyLevel);
      case 'update_employee_department':
        return await updateEmployeeDepartment(res, supabase, orgId, payload, userHierarchyLevel);
      case 'create_department':
        return await createDepartment(res, supabase, orgId, payload);
      case 'update_department':
        return await updateDepartment(res, supabase, orgId, payload);
      case 'delete_department':
        return await deleteDepartment(res, supabase, orgId, payload);
      case 'set_department_head':
        return await setDepartmentHead(res, supabase, orgId, payload);
      case 'update_department_groups':
        return await updateDepartmentGroups(res, supabase, orgId, payload);
      case 'create_group':
        return await createGroup(res, supabase, orgId, payload);
      case 'update_group':
        return await updateGroup(res, supabase, orgId, payload);
      case 'delete_group':
        return await deleteGroup(res, supabase, orgId, payload);
      case 'update_group_members':
        return await updateGroupMembers(res, supabase, orgId, payload);
      case 'update_group_supervisor':
        return await updateGroupSupervisor(res, supabase, orgId, payload);
      case 'update_group_reports_to':
        return await updateGroupReportsTo(res, supabase, orgId, payload);
      default:
        return res.status(400).json({ error: `Unknown intent: ${intent}` });
    }
  } catch (err: any) {
    console.error('Org chart POST error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getEmployeeHierarchyLevel(
  supabase: any,
  orgId: string,
  employeeId: string
): Promise<number> {
  const { data: emp } = await supabase
    .from('employees')
    .select('role')
    .eq('id', employeeId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!emp?.role) return 999;

  const { data: role } = await supabase
    .from('org_roles')
    .select('hierarchy_level')
    .eq('org_id', orgId)
    .eq('role_name', emp.role)
    .maybeSingle();

  return role?.hierarchy_level ?? 999;
}

async function validateHierarchy(
  supabase: any,
  orgId: string,
  employeeId: string,
  userHierarchyLevel: number
): Promise<boolean> {
  if (userHierarchyLevel === -1) return true; // Levelset Admin
  const empLevel = await getEmployeeHierarchyLevel(supabase, orgId, employeeId);
  return userHierarchyLevel < empLevel;
}

/**
 * Walk up the supervisor chain to detect cycles.
 * Returns true if adding supervisorId as a parent of employeeId would create a cycle.
 */
async function wouldCreateCycle(
  supabase: any,
  orgId: string,
  employeeId: string,
  supervisorId: string
): Promise<boolean> {
  const visited = new Set<string>();
  let current = supervisorId;

  while (current) {
    if (current === employeeId) return true;
    if (visited.has(current)) return false; // already in a cycle, but not ours
    visited.add(current);

    const { data: emp } = await supabase
      .from('employees')
      .select('direct_supervisor_id')
      .eq('id', current)
      .eq('org_id', orgId)
      .maybeSingle();

    current = emp?.direct_supervisor_id;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------

async function updateEmployeeTitle(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any,
  userLevel: number
) {
  const { employee_id, title } = payload;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });

  const canEdit = await validateHierarchy(supabase, orgId, employee_id, userLevel);
  if (!canEdit) return res.status(403).json({ error: 'Cannot edit employees at or above your level' });

  const { data, error } = await supabase
    .from('employees')
    .update({ title: title || null })
    .eq('id', employee_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function updateSupervisor(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any,
  userLevel: number
) {
  const { employee_id, supervisor_type, supervisor_id } = payload;
  // Also accept direct fields for backward compat
  let direct_supervisor_id = payload.direct_supervisor_id || null;
  let supervisor_group_id = payload.supervisor_group_id || null;

  // Map supervisor_type/supervisor_id to the correct field
  if (supervisor_type === 'employee' && supervisor_id) {
    direct_supervisor_id = supervisor_id;
    supervisor_group_id = null;
  } else if (supervisor_type === 'group' && supervisor_id) {
    direct_supervisor_id = null;
    supervisor_group_id = supervisor_id;
  } else if (supervisor_type === null || supervisor_id === null) {
    // Clearing supervisor
    direct_supervisor_id = null;
    supervisor_group_id = null;
  }

  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });

  const canEdit = await validateHierarchy(supabase, orgId, employee_id, userLevel);
  if (!canEdit) return res.status(403).json({ error: 'Cannot edit employees at or above your level' });

  // Mutually exclusive
  if (direct_supervisor_id && supervisor_group_id) {
    return res.status(400).json({ error: 'Cannot have both individual and group supervisor' });
  }

  // Cycle detection for individual supervisor
  if (direct_supervisor_id) {
    const hasCycle = await wouldCreateCycle(supabase, orgId, employee_id, direct_supervisor_id);
    if (hasCycle) {
      return res.status(400).json({ error: 'This assignment would create a circular reporting chain' });
    }
  }

  const updateData: any = {
    direct_supervisor_id: direct_supervisor_id || null,
    supervisor_group_id: supervisor_group_id || null,
  };

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', employee_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function updateEmployeeDepartment(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any,
  userLevel: number
) {
  const { employee_id, department_id } = payload;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });

  const canEdit = await validateHierarchy(supabase, orgId, employee_id, userLevel);
  if (!canEdit) return res.status(403).json({ error: 'Cannot edit employees at or above your level' });

  const { data, error } = await supabase
    .from('employees')
    .update({ department_id: department_id || null })
    .eq('id', employee_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function createDepartment(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { name, location_id, department_head_id } = payload;
  if (!name) return res.status(400).json({ error: 'name required' });

  const { data, error } = await supabase
    .from('org_departments')
    .insert({
      name,
      org_id: orgId,
      location_id: location_id || null,
      department_head_id: department_head_id || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}

async function updateDepartment(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { department_id, name } = payload;
  if (!department_id) return res.status(400).json({ error: 'department_id required' });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;

  const { data, error } = await supabase
    .from('org_departments')
    .update(updateData)
    .eq('id', department_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function deleteDepartment(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { department_id } = payload;
  if (!department_id) return res.status(400).json({ error: 'department_id required' });

  // Clear department_id on employees first
  await supabase
    .from('employees')
    .update({ department_id: null })
    .eq('department_id', department_id)
    .eq('org_id', orgId);

  const { error } = await supabase
    .from('org_departments')
    .delete()
    .eq('id', department_id)
    .eq('org_id', orgId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function setDepartmentHead(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { department_id, department_head_id } = payload;
  if (!department_id) return res.status(400).json({ error: 'department_id required' });

  const { data, error } = await supabase
    .from('org_departments')
    .update({ department_head_id: department_head_id || null })
    .eq('id', department_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function updateDepartmentGroups(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { department_id, group_ids } = payload;
  if (!department_id) return res.status(400).json({ error: 'department_id required' });
  if (!Array.isArray(group_ids)) return res.status(400).json({ error: 'group_ids must be an array' });

  // 1. Clear department_id on groups that currently belong to this department
  //    but are NOT in the new list
  await supabase
    .from('org_groups')
    .update({ department_id: null })
    .eq('department_id', department_id)
    .eq('org_id', orgId);

  // 2. Set department_id on all groups in the new list
  if (group_ids.length > 0) {
    const { error } = await supabase
      .from('org_groups')
      .update({ department_id })
      .in('id', group_ids)
      .eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}

async function createGroup(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { name, location_id, department_id, role_name } = payload;
  if (!name || !role_name) {
    return res.status(400).json({ error: 'name and role_name required' });
  }

  const { data, error } = await supabase
    .from('org_groups')
    .insert({
      name,
      org_id: orgId,
      location_id: location_id || null,
      department_id: department_id || null,
      role_name,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}

async function updateGroup(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { group_id, name, department_id, role_name } = payload;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (department_id !== undefined) updateData.department_id = department_id || null;
  if (role_name !== undefined) updateData.role_name = role_name;

  const { data, error } = await supabase
    .from('org_groups')
    .update(updateData)
    .eq('id', group_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function deleteGroup(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { group_id } = payload;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });

  // Clear supervisor_group_id on employees first
  await supabase
    .from('employees')
    .update({ supervisor_group_id: null })
    .eq('supervisor_group_id', group_id)
    .eq('org_id', orgId);

  const { error } = await supabase
    .from('org_groups')
    .delete()
    .eq('id', group_id)
    .eq('org_id', orgId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function updateGroupMembers(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { group_id, employee_ids } = payload;
  if (!group_id || !Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'group_id and employee_ids[] required' });
  }

  // Validate all employees match the group's role_name
  const { data: group } = await supabase
    .from('org_groups')
    .select('role_name')
    .eq('id', group_id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!group) return res.status(404).json({ error: 'Group not found' });

  if (employee_ids.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, role')
      .eq('org_id', orgId)
      .in('id', employee_ids);

    const mismatch = (employees || []).filter((e: any) => e.role !== group.role_name);
    if (mismatch.length > 0) {
      return res.status(400).json({
        error: `All group members must have role "${group.role_name}". Mismatched: ${mismatch.map((e: any) => e.id).join(', ')}`,
      });
    }
  }

  // Replace members: delete all, then insert new set
  await supabase
    .from('org_group_members')
    .delete()
    .eq('org_group_id', group_id)
    .eq('org_id', orgId);

  if (employee_ids.length > 0) {
    const rows = employee_ids.map((eid: string) => ({
      org_group_id: group_id,
      employee_id: eid,
      org_id: orgId,
    }));

    const { error: insertError } = await supabase
      .from('org_group_members')
      .insert(rows);

    if (insertError) return res.status(500).json({ error: insertError.message });
  }

  // Return updated members
  const { data: updatedMembers } = await supabase
    .from('org_group_members')
    .select('*')
    .eq('org_group_id', group_id)
    .eq('org_id', orgId);

  return res.status(200).json({ group_id, members: updatedMembers || [] });
}

async function updateGroupSupervisor(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { group_id, supervisor_group_id } = payload;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });

  // Prevent self-reference
  if (supervisor_group_id === group_id) {
    return res.status(400).json({ error: 'A group cannot report to itself' });
  }

  // Validate the target group exists and belongs to the same org
  if (supervisor_group_id) {
    const { data: targetGroup } = await supabase
      .from('org_groups')
      .select('id')
      .eq('id', supervisor_group_id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (!targetGroup) {
      return res.status(404).json({ error: 'Target group not found' });
    }
  }

  const { data, error } = await supabase
    .from('org_groups')
    .update({ supervisor_group_id: supervisor_group_id || null })
    .eq('id', group_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function updateGroupReportsTo(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { group_id, supervisor_type, supervisor_id } = payload;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });

  // Fetch group
  const { data: group } = await supabase
    .from('org_groups')
    .select('id, supervisor_group_id')
    .eq('id', group_id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Fetch group members
  const { data: members } = await supabase
    .from('org_group_members')
    .select('employee_id')
    .eq('org_group_id', group_id)
    .eq('org_id', orgId);

  const memberIds = (members || []).map((m: any) => m.employee_id);

  if (supervisor_type === 'employee' && supervisor_id) {
    // Validate supervisor employee exists
    const { data: supEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', supervisor_id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (!supEmp) return res.status(404).json({ error: 'Supervisor employee not found' });

    // Clear group's supervisor_group_id (relationship lives on members now)
    await supabase
      .from('org_groups')
      .update({ supervisor_group_id: null })
      .eq('id', group_id)
      .eq('org_id', orgId);

    // Set direct_supervisor_id on all members, clear supervisor_group_id
    if (memberIds.length > 0) {
      await supabase
        .from('employees')
        .update({ direct_supervisor_id: supervisor_id, supervisor_group_id: null })
        .in('id', memberIds)
        .eq('org_id', orgId);
    }
  } else if (supervisor_type === 'group' && supervisor_id) {
    // Prevent self-reference
    if (supervisor_id === group_id) {
      return res.status(400).json({ error: 'A group cannot report to itself' });
    }

    // Validate target group exists
    const { data: targetGroup } = await supabase
      .from('org_groups')
      .select('id')
      .eq('id', supervisor_id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (!targetGroup) return res.status(404).json({ error: 'Target group not found' });

    // Set group's supervisor_group_id
    await supabase
      .from('org_groups')
      .update({ supervisor_group_id: supervisor_id })
      .eq('id', group_id)
      .eq('org_id', orgId);

    // Clear individual supervisor on all members (group relationship is on the group itself)
    if (memberIds.length > 0) {
      await supabase
        .from('employees')
        .update({ direct_supervisor_id: null, supervisor_group_id: null })
        .in('id', memberIds)
        .eq('org_id', orgId);
    }
  } else {
    // Clearing supervisor entirely
    await supabase
      .from('org_groups')
      .update({ supervisor_group_id: null })
      .eq('id', group_id)
      .eq('org_id', orgId);

    if (memberIds.length > 0) {
      await supabase
        .from('employees')
        .update({ direct_supervisor_id: null, supervisor_group_id: null })
        .in('id', memberIds)
        .eq('org_id', orgId);
    }
  }

  return res.status(200).json({ success: true });
}
