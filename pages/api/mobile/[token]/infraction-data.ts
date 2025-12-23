import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Location numbers for which discipline (infractions) should be disabled
const DISCIPLINE_DISABLED_LOCATIONS: string[] = [];

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

  // Block discipline access for disabled locations
  if (DISCIPLINE_DISABLED_LOCATIONS.includes(location.location_number ?? '')) {
    return res.status(403).json({ error: 'Discipline features are not available for this location' });
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

  // Fetch employees
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, role, is_leader, active')
    .eq('location_id', location.id)
    .eq('active', true)
    .order('full_name');

  if (employeesError) {
    console.error('[mobile] Failed to load employees for infractions form', token, employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  // Try to load infractions - first check org-level (location_id IS NULL), then location-specific
  let finalRubricData: any[] | null = null;

  // First, try org-level infractions if org_id exists
  if (location.org_id) {
    const { data: orgRubricData, error: orgRubricError } = await supabase
      .from('infractions_rubric')
      .select('id, action, action_es, points')
      .eq('org_id', location.org_id)
      .is('location_id', null)
      .order('points');

    if (!orgRubricError && orgRubricData && orgRubricData.length > 0) {
      finalRubricData = orgRubricData;
    }
  }

  // If no org-level infractions found, try location-specific
  if (!finalRubricData || finalRubricData.length === 0) {
    const { data: locationRubricData, error: locationRubricError } = await supabase
      .from('infractions_rubric')
      .select('id, action, action_es, points')
      .eq('location_id', location.id)
      .order('points');

    if (locationRubricError) {
      // If error is about action_es column, try without it
      if (locationRubricError.message?.includes('action_es')) {
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
      } else {
        console.error('[mobile] Failed to load infractions rubric', token, locationRubricError);
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

