import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenParam = req.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  const location = await fetchLocationByToken(token);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const supabase = createServerSupabaseClient();

  // Try to load with Spanish columns, fallback to base columns if migration hasn't been run
  let positionsQuery = supabase
    .from('position_big5_labels')
    .select('position, position_es, zone')
    .eq('location_id', location.id)
    .order('zone', { ascending: true })
    .order('position', { ascending: true });

  const [{ data: employeesData, error: employeesError }, { data: positionsData, error: positionsError }] =
    await Promise.all([
      supabase
        .from('employees')
        .select('id, full_name, first_name, last_name, role, active')
        .eq('location_id', location.id)
        .eq('active', true)
        .order('full_name'),
      positionsQuery,
    ]);

  if (employeesError) {
    console.error('[mobile] Failed to fetch employees for token', token, employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  // If positions query failed, try without position_es column (migration may not be run)
  let finalPositionsData: any[] | null = positionsData;
  
  if (positionsError && positionsError.message?.includes('position_es')) {
    console.warn('[mobile] position_es column not found, falling back to base columns', token);
    const fallbackResult = await supabase
      .from('position_big5_labels')
      .select('position, zone')
      .eq('location_id', location.id)
      .order('zone', { ascending: true })
      .order('position', { ascending: true });
    
    if (fallbackResult.error) {
      console.error('[mobile] Failed to fetch positions for token', token, fallbackResult.error);
      return res.status(500).json({ error: 'Failed to load positions' });
    }
    finalPositionsData = fallbackResult.data;
  } else if (positionsError) {
    console.error('[mobile] Failed to fetch positions for token', token, positionsError);
    return res.status(500).json({ error: 'Failed to load positions' });
  }

  // Fetch role permissions for filtering positions by leader role
  // Map role -> position names they can rate
  let rolePermissions: Record<string, string[]> = {};
  if (location.org_id) {
    const { data: permissionsData } = await supabase
      .from('position_role_permissions')
      .select('position_id, role_name, org_positions!inner(name)')
      .eq('org_positions.org_id', location.org_id);

    if (permissionsData && permissionsData.length > 0) {
      // Build a map of role -> position names
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
  }

  const employees = (employeesData ?? []).map((emp) => ({
    id: emp.id,
    name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
    role: emp.role ?? null,
  }));

  const leaders = employees.filter((emp) => isLeaderRole(emp.role));

  const zoneOrder: Array<'FOH' | 'BOH'> = ['FOH', 'BOH'];
  const positionsMap = new Map<string, { name: string; name_es: string | null; zone: 'FOH' | 'BOH' }>();

  (finalPositionsData ?? []).forEach((item: any) => {
    const name = item.position?.trim();
    if (!name) return;
    const zone = (item.zone === 'BOH' ? 'BOH' : 'FOH') as 'FOH' | 'BOH';
    if (!positionsMap.has(name)) {
      positionsMap.set(name, { 
        name, 
        name_es: item.position_es ?? null,
        zone 
      });
    }
  });

  const positions = Array.from(positionsMap.values()).map(p => ({
    name: p.name,
    name_es: p.name_es,
    zone: p.zone,
  })).sort((a, b) => {
    const zoneDiff = zoneOrder.indexOf(a.zone) - zoneOrder.indexOf(b.zone);
    if (zoneDiff !== 0) return zoneDiff;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    employees,
    leaders,
    positions,
    rolePermissions, // Map of role -> position names that role can rate
  });
}

