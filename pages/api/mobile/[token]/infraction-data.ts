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

function isLeaderRole(role?: string | null, isLeaderFlag?: boolean | null) {
  if (isLeaderFlag) {
    return true;
  }
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

  // Fetch location details including password
  const { data: locationData } = await supabase
    .from('locations')
    .select('discipline_password')
    .eq('id', location.id)
    .single();

  const disciplinePassword = locationData?.discipline_password || location.location_number || '';

  // Fetch discipline role access settings if org_id exists
  let allowedRoles: Set<string> | null = null;
  if (location.org_id) {
    const { data: accessData } = await supabase
      .from('discipline_role_access')
      .select('role_name')
      .eq('org_id', location.org_id)
      .eq('can_submit', true);

    if (accessData && accessData.length > 0) {
      allowedRoles = new Set(accessData.map(a => a.role_name));
    }
  }

  // Try to load with Spanish columns, fallback to base columns if migration hasn't been run
  let rubricQuery = supabase
    .from('infractions_rubric')
    .select('id, action, action_es, points')
    .eq('location_id', location.id)
    .order('points');

  const [{ data: employeesData, error: employeesError }, { data: rubricData, error: rubricError }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, first_name, last_name, role, is_leader, active')
      .eq('location_id', location.id)
      .eq('active', true)
      .order('full_name'),
    rubricQuery,
  ]);

  if (employeesError) {
    console.error('[mobile] Failed to load employees for infractions form', token, employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  // If rubric query failed, try without action_es column (migration may not be run)
  let finalRubricData: any[] | null = rubricData;
  
  if (rubricError && rubricError.message?.includes('action_es')) {
    console.warn('[mobile] action_es column not found, falling back to base columns', token);
    const fallbackResult = await supabase
      .from('infractions_rubric')
      .select('id, action, points')
      .eq('location_id', location.id)
      .order('points');
    
    if (fallbackResult.error) {
      console.error('[mobile] Failed to load infractions rubric', token, fallbackResult.error);
      return res.status(500).json({ error: 'Failed to load infractions rubric' });
    }
    finalRubricData = fallbackResult.data;
  } else if (rubricError) {
    console.error('[mobile] Failed to load infractions rubric', token, rubricError);
    return res.status(500).json({ error: 'Failed to load infractions rubric' });
  }

  const employees = (employeesData ?? []).map((emp) => ({
    id: emp.id,
    name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
    role: emp.role ?? null,
  }));

  // Filter leaders based on:
  // 1. If allowedRoles is configured, only include employees whose role is in allowedRoles
  // 2. Otherwise, fallback to the isLeaderRole check
  const leaders = (employeesData ?? [])
    .filter((emp) => {
      if (allowedRoles) {
        // If access rules are configured, only allow roles that have can_submit = true
        return emp.role && allowedRoles.has(emp.role);
      }
      // Fallback to traditional leader check
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
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    employees,
    leaders,
    infractions,
    disciplinePassword,
  });
}

