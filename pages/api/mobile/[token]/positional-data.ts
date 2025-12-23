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

  // Fetch employees
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, role, active')
    .eq('location_id', location.id)
    .eq('active', true)
    .order('full_name');

  if (employeesError) {
    console.error('[mobile] Failed to fetch employees for token', token, employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  // Primary source: org_positions (new org-level settings)
  let positions: Array<{ name: string; name_es: string | null; zone: 'FOH' | 'BOH'; description: string | null }> = [];
  
  if (location.org_id) {
    const { data: orgPositionsData, error: orgPositionsError } = await supabase
      .from('org_positions')
      .select('name, description, zone, display_order')
      .eq('org_id', location.org_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!orgPositionsError && orgPositionsData && orgPositionsData.length > 0) {
      positions = orgPositionsData.map((item: any) => ({
        name: item.name,
        name_es: null, // org_positions doesn't have Spanish translations yet
        zone: (item.zone === 'BOH' ? 'BOH' : 'FOH') as 'FOH' | 'BOH',
        description: item.description ?? null,
      }));
    }
  }

  // Fallback: position_big5_labels (legacy location-based positions)
  if (positions.length === 0) {
    // Try to load with Spanish columns, fallback to base columns if migration hasn't been run
    let positionsData: any[] | null = null;
    
    const { data: positionsDataWithEs, error: positionsError } = await supabase
      .from('position_big5_labels')
      .select('position, position_es, zone')
      .eq('location_id', location.id)
      .order('zone', { ascending: true })
      .order('position', { ascending: true });

    // If positions query failed due to missing Spanish column, retry without it
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
        // Don't fail - just return empty positions
        positionsData = [];
      } else {
        positionsData = fallbackResult.data;
      }
    } else if (positionsError) {
      console.error('[mobile] Failed to fetch positions for token', token, positionsError);
      // Don't fail - just return empty positions
      positionsData = [];
    } else {
      positionsData = positionsDataWithEs;
    }

    // Build positions from legacy table
    const positionsMap = new Map<string, { name: string; name_es: string | null; zone: 'FOH' | 'BOH'; description: string | null }>();
    (positionsData ?? []).forEach((item: any) => {
      const name = item.position?.trim();
      if (!name) return;
      const zone = (item.zone === 'BOH' ? 'BOH' : 'FOH') as 'FOH' | 'BOH';
      if (!positionsMap.has(name)) {
        positionsMap.set(name, {
          name,
          name_es: item.position_es ?? null,
          zone,
          description: null,
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

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    employees,
    leaders,
    positions,
    rolePermissions, // Map of role -> position names that role can rate
  });
}

