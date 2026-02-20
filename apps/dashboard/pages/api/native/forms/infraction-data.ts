/**
 * Native Form API: Infraction Data
 * GET /api/native/forms/infraction-data?location_id=<id>
 *
 * Authenticated version of /api/mobile/[token]/infraction-data
 * Returns employees, leaders, infractions rubric, and discipline password.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

function normalizeName(fullName?: string | null, firstName?: string | null, lastName?: string | null) {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }
  const composed = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return composed.length > 0 ? composed : 'Unnamed';
}

function isLeaderRole(role?: string | null, isLeaderFlag?: boolean | null) {
  if (isLeaderFlag) return true;
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized.includes('lead') ||
    normalized.includes('manager') ||
    normalized.includes('director') ||
    normalized.includes('executive') ||
    normalized.includes('operator') ||
    normalized.includes('trainer') ||
    normalized.includes('owner')
  );
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const locationId = Array.isArray(req.query.location_id)
    ? req.query.location_id[0]
    : req.query.location_id;

  if (!locationId) {
    return res.status(400).json({ error: 'Missing location_id' });
  }

  const location = await validateLocationAccess(context.userId, context.orgId, locationId);
  if (!location) {
    return res.status(403).json({ error: 'Access denied for this location' });
  }

  const supabase = createServerSupabaseClient();

  // Fetch location discipline password
  const { data: locationData } = await supabase
    .from('locations')
    .select('discipline_password')
    .eq('id', location.id)
    .single();

  const disciplinePassword = locationData?.discipline_password || location.location_number || '';

  // Fetch discipline role access settings
  let allowedRoles: Set<string> | null = null;
  if (location.org_id) {
    const { data: orgRolesData } = await supabase
      .from('org_roles')
      .select('role_name, hierarchy_level')
      .eq('org_id', location.org_id);

    const { data: accessData } = await supabase
      .from('discipline_role_access')
      .select('role_name, can_submit')
      .eq('org_id', location.org_id);

    if (orgRolesData && orgRolesData.length > 0) {
      const accessMap = new Map<string, boolean>();
      (accessData || []).forEach((a) => accessMap.set(a.role_name, a.can_submit));

      allowedRoles = new Set<string>();

      orgRolesData.forEach((role) => {
        const explicitSetting = accessMap.get(role.role_name);
        if (explicitSetting !== undefined) {
          if (explicitSetting) {
            allowedRoles!.add(role.role_name);
          }
        } else {
          // Defaults: levels 0-2 allowed
          if (role.hierarchy_level <= 2) {
            allowedRoles!.add(role.role_name);
          }
        }
      });
    }
  }

  // Fetch employees
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, role, is_leader, active')
    .eq('location_id', location.id)
    .eq('active', true)
    .order('full_name');

  if (employeesError) {
    console.error('[native] Failed to load employees', employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  // Load infractions rubric - org-level first, then location-specific fallback
  let finalRubricData: any[] | null = null;

  if (location.org_id) {
    const { data: orgRubricData, error: orgRubricError } = await supabase
      .from('infractions_rubric')
      .select('id, action, action_es, points, require_tm_signature, require_leader_signature')
      .eq('org_id', location.org_id)
      .is('location_id', null)
      .order('points');

    if (!orgRubricError && orgRubricData && orgRubricData.length > 0) {
      finalRubricData = orgRubricData;
    }
  }

  if (!finalRubricData || finalRubricData.length === 0) {
    const { data: locationRubricData, error: locationRubricError } = await supabase
      .from('infractions_rubric')
      .select('id, action, action_es, points, require_tm_signature, require_leader_signature')
      .eq('location_id', location.id)
      .order('points');

    if (locationRubricError) {
      if (locationRubricError.message?.includes('action_es')) {
        const fallbackResult = await supabase
          .from('infractions_rubric')
          .select('id, action, points, require_tm_signature, require_leader_signature')
          .eq('location_id', location.id)
          .order('points');

        if (fallbackResult.error) {
          console.error('[native] Failed to load infractions rubric', fallbackResult.error);
          return res.status(500).json({ error: 'Failed to load infractions rubric' });
        }
        finalRubricData = fallbackResult.data;
      } else {
        console.error('[native] Failed to load infractions rubric', locationRubricError);
        return res.status(500).json({ error: 'Failed to load infractions rubric' });
      }
    } else {
      finalRubricData = locationRubricData;
    }
  }

  const employees = (employeesData ?? []).map((emp) => ({
    id: emp.id,
    name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
    role: emp.role ?? null,
  }));

  const leaders = (employeesData ?? [])
    .filter((emp) => {
      if (allowedRoles) {
        return emp.role && allowedRoles.has(emp.role);
      }
      return isLeaderRole(emp.role, emp.is_leader);
    })
    .map((emp) => ({
      id: emp.id,
      name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
      role: emp.role ?? null,
    }));

  const infractions = (finalRubricData ?? []).map((item: any) => ({
    id: item.id,
    action: item.action,
    action_es: item.action_es ?? null,
    points: item.points ?? 0,
    require_tm_signature: item.require_tm_signature ?? false,
    require_leader_signature: item.require_leader_signature ?? false,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    employees,
    leaders,
    infractions,
    disciplinePassword,
  });
}

export default withPermissionAndContext(P.DISC_SUBMIT_INFRACTIONS, handler);
