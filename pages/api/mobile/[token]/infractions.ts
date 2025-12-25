import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Location numbers for which discipline (infractions) should be disabled
const DISCIPLINE_DISABLED_LOCATIONS: string[] = [];

interface InfractionsRequestBody {
  leaderId?: string;
  employeeId?: string;
  infractionId?: string;
  infractionDate?: string | null;
  acknowledged?: boolean;
  notes?: string | null;
  teamMemberSignature?: string | null;
  leaderSignature?: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenParam = req.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  const body: InfractionsRequestBody = req.body ?? {};
  const { leaderId, employeeId, infractionId, infractionDate, acknowledged, notes, teamMemberSignature, leaderSignature } = body;

  if (!leaderId || !employeeId || !infractionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!leaderSignature || leaderSignature.trim().length === 0) {
    return res.status(400).json({ error: 'Leader signature is required' });
  }

  if (acknowledged && (!teamMemberSignature || teamMemberSignature.trim().length === 0)) {
    return res.status(400).json({ error: 'Team member signature is required when acknowledgement is checked' });
  }

  const location = await fetchLocationByToken(token);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  // Block discipline access for disabled locations
  if (DISCIPLINE_DISABLED_LOCATIONS.includes(location.location_number ?? '')) {
    return res.status(403).json({ error: 'Discipline features are not available for this location' });
  }

  if (!location.org_id) {
    return res.status(500).json({ error: 'Location is missing org reference' });
  }

  const supabase = createServerSupabaseClient();

  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('location_id', location.id)
    .in('id', [leaderId, employeeId]);

  if (employeesError) {
    console.error('[mobile] Failed to validate employees for infractions form', token, employeesError);
    return res.status(500).json({ error: 'Failed to validate employees' });
  }

  if (!employeesData || employeesData.length < 2) {
    return res.status(400).json({ error: 'Leader or employee is not valid for this location' });
  }

  // First try org-level infractions (location_id IS NULL)
  let rubric: { action: string; points: number | null } | null = null;

  if (location.org_id) {
    const { data: orgRubric, error: orgRubricError } = await supabase
      .from('infractions_rubric')
      .select('action, points')
      .eq('org_id', location.org_id)
      .is('location_id', null)
      .eq('id', infractionId)
      .maybeSingle();

    if (orgRubricError) {
      console.error('[mobile] Failed to fetch org-level infractions rubric for token', token, orgRubricError);
    } else if (orgRubric) {
      rubric = orgRubric;
    }
  }

  // If not found at org level, try location-specific
  if (!rubric) {
    const { data: locationRubric, error: locationRubricError } = await supabase
      .from('infractions_rubric')
      .select('action, points')
      .eq('location_id', location.id)
      .eq('id', infractionId)
      .maybeSingle();

    if (locationRubricError) {
      console.error('[mobile] Failed to fetch infractions rubric for token', token, locationRubricError);
      return res.status(500).json({ error: 'Failed to load infraction details' });
    }

    rubric = locationRubric;
  }

  if (!rubric) {
    return res.status(400).json({ error: 'Invalid infraction selected' });
  }

  const employeeRecord = employeesData.find((emp) => emp.id === employeeId);

  // Use provided date or default to today
  const dateToUse = infractionDate && /^\d{4}-\d{2}-\d{2}$/.test(infractionDate) 
    ? infractionDate 
    : new Date().toISOString().split('T')[0];

  const { data: inserted, error: insertError } = await supabase
    .from('infractions')
    .insert({
      employee_id: employeeId,
      leader_id: leaderId,
      infraction: rubric.action,
      points: rubric.points ?? 0,
      acknowledgement: acknowledged ? 'Notified' : 'Not notified',
      ack_bool: Boolean(acknowledged),
      infraction_date: dateToUse,
      org_id: location.org_id,
      location_id: location.id,
      notes: notes ?? null,
      team_member_signature: teamMemberSignature ?? null,
      leader_signature: leaderSignature,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[mobile] Failed to insert infraction for token', token, insertError);
    return res.status(500).json({ error: 'Failed to submit infraction' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    infractionId: inserted?.id ?? null,
    employeeName: employeeRecord?.full_name ?? null,
    action: rubric.action,
    points: rubric.points ?? 0,
  });
}

