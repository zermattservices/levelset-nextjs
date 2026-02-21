/**
 * Native Form API: Positional Data
 * GET /api/native/forms/positional-data?location_id=<id>
 *
 * Authenticated version of /api/mobile/[token]/positional-data
 * Returns employees, leaders, positions, role permissions, and feature flags.
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

function isLeaderRole(role?: string | null) {
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

  // Fetch employees
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, role, active')
    .eq('location_id', location.id)
    .eq('active', true)
    .order('full_name');

  if (employeesError) {
    console.error('[native] Failed to fetch employees', employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  // Primary source: org_positions (org-level settings)
  let positions: Array<{
    name: string;
    name_es: string | null;
    zone: 'FOH' | 'BOH';
    description: string | null;
    description_es: string | null;
  }> = [];

  if (location.org_id) {
    const { data: orgPositionsData, error: orgPositionsError } = await supabase
      .from('org_positions')
      .select('name, name_es, description, description_es, zone, display_order')
      .eq('org_id', location.org_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!orgPositionsError && orgPositionsData && orgPositionsData.length > 0) {
      positions = orgPositionsData.map((item: any) => ({
        name: item.name,
        name_es: item.name_es || item.name || null,
        zone: (item.zone === 'BOH' ? 'BOH' : 'FOH') as 'FOH' | 'BOH',
        description: item.description ?? null,
        description_es: item.description_es || item.description || null,
      }));
    }
  }

  // Fallback: position_big5_labels (legacy location-based positions)
  if (positions.length === 0) {
    let positionsData: any[] | null = null;

    const { data: positionsDataWithEs, error: positionsError } = await supabase
      .from('position_big5_labels')
      .select('position, position_es, zone')
      .eq('location_id', location.id)
      .order('zone', { ascending: true })
      .order('position', { ascending: true });

    if (positionsError && positionsError.message?.includes('position_es')) {
      const fallbackResult = await supabase
        .from('position_big5_labels')
        .select('position, zone')
        .eq('location_id', location.id)
        .order('zone', { ascending: true })
        .order('position', { ascending: true });

      positionsData = fallbackResult.error ? [] : fallbackResult.data;
    } else if (positionsError) {
      positionsData = [];
    } else {
      positionsData = positionsDataWithEs;
    }

    const positionsMap = new Map<
      string,
      { name: string; name_es: string | null; zone: 'FOH' | 'BOH'; description: string | null; description_es: string | null }
    >();
    (positionsData ?? []).forEach((item: any) => {
      const name = item.position?.trim();
      if (!name) return;
      const zone = (item.zone === 'BOH' ? 'BOH' : 'FOH') as 'FOH' | 'BOH';
      if (!positionsMap.has(name)) {
        positionsMap.set(name, {
          name,
          name_es: item.position_es || name,
          zone,
          description: null,
          description_es: null,
        });
      }
    });

    positions = Array.from(positionsMap.values());
  }

  // Sort positions by zone then name
  const zoneOrder: Array<'FOH' | 'BOH'> = ['FOH', 'BOH'];
  positions.sort((a, b) => {
    const zoneDiff = zoneOrder.indexOf(a.zone) - zoneOrder.indexOf(b.zone);
    if (zoneDiff !== 0) return zoneDiff;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  // Fetch role permissions for filtering positions by leader role
  let rolePermissions: Record<string, string[]> = {};
  let requireRatingComments = false;

  if (location.org_id) {
    const { data: permissionsData } = await supabase
      .from('position_role_permissions')
      .select('position_id, role_name, org_positions!inner(name)')
      .eq('org_positions.org_id', location.org_id);

    if (permissionsData && permissionsData.length > 0) {
      permissionsData.forEach((p: any) => {
        const positionName = p.org_positions?.name;
        if (positionName && p.role_name) {
          if (!rolePermissions[p.role_name]) {
            rolePermissions[p.role_name] = [];
          }
          if (!rolePermissions[p.role_name].includes(positionName)) {
            rolePermissions[p.role_name].push(positionName);
          }
        }
      });
    }

    // Fetch org feature toggles
    const { data: featureToggles } = await supabase
      .from('org_feature_toggles')
      .select('require_rating_comments')
      .eq('org_id', location.org_id)
      .single();

    if (featureToggles?.require_rating_comments) {
      requireRatingComments = true;
    }
  }

  const employees = (employeesData ?? []).map((emp) => ({
    id: emp.id,
    name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
    role: emp.role ?? null,
  }));

  // Determine leaders based on role permissions or fallback
  const rolesWithPermissions = new Set(Object.keys(rolePermissions));

  const leaders = employees.filter((emp) => {
    if (!emp.role) return false;
    if (rolesWithPermissions.size > 0) {
      return rolesWithPermissions.has(emp.role);
    }
    return isLeaderRole(emp.role);
  });

  res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Vary', 'Authorization');
  return res.status(200).json({
    employees,
    leaders,
    positions,
    rolePermissions,
    requireRatingComments,
  });
}

export default withPermissionAndContext(P.PE_SUBMIT_RATINGS, handler);
