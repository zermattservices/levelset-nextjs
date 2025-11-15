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

  const [{ data: employeesData, error: employeesError }, { data: rubricData, error: rubricError }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, first_name, last_name, role, is_leader, active')
      .eq('location_id', location.id)
      .eq('active', true)
      .order('full_name'),
    supabase
      .from('infractions_rubric')
      .select('id, action, points')
      .eq('location_id', location.id)
      .order('points'),
  ]);

  if (employeesError) {
    console.error('[mobile] Failed to load employees for infractions form', token, employeesError);
    return res.status(500).json({ error: 'Failed to load employees' });
  }

  if (rubricError) {
    console.error('[mobile] Failed to load infractions rubric', token, rubricError);
    return res.status(500).json({ error: 'Failed to load infractions rubric' });
  }

  const employees = (employeesData ?? []).map((emp) => ({
    id: emp.id,
    name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
    role: emp.role ?? null,
  }));

  const leaders = (employeesData ?? [])
    .filter((emp) => isLeaderRole(emp.role, emp.is_leader))
    .map((emp) => ({
      id: emp.id,
      name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
      role: emp.role ?? null,
    }));

  const infractions = (rubricData ?? []).map((item) => ({
    id: item.id,
    action: item.action,
    points: item.points ?? 0,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    employees,
    leaders,
    infractions,
  });
}

