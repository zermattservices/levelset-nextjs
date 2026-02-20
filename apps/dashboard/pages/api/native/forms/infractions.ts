/**
 * Native Form API: Submit Infraction
 * POST /api/native/forms/infractions
 *
 * Authenticated version of /api/mobile/[token]/infractions
 * Submits a discipline infraction record.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

interface InfractionsRequestBody {
  location_id?: string;
  leaderId?: string;
  employeeId?: string;
  infractionId?: string;
  infractionDate?: string | null;
  acknowledged?: boolean;
  notes?: string | null;
  teamMemberSignature?: string | null;
  leaderSignature?: string | null;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body: InfractionsRequestBody = req.body ?? {};
  const {
    location_id: locationId,
    leaderId,
    employeeId,
    infractionId,
    infractionDate,
    acknowledged,
    notes,
    teamMemberSignature,
    leaderSignature,
  } = body;

  if (!locationId) {
    return res.status(400).json({ error: 'Missing location_id' });
  }

  if (!leaderId || !employeeId || !infractionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!leaderSignature || leaderSignature.trim().length === 0) {
    return res.status(400).json({ error: 'Leader signature is required' });
  }

  if (acknowledged && (!teamMemberSignature || teamMemberSignature.trim().length === 0)) {
    return res.status(400).json({ error: 'Team member signature is required when acknowledgement is checked' });
  }

  const location = await validateLocationAccess(context.userId, context.orgId, locationId);
  if (!location) {
    return res.status(403).json({ error: 'Access denied for this location' });
  }

  if (!location.org_id) {
    return res.status(500).json({ error: 'Location is missing org reference' });
  }

  const supabase = createServerSupabaseClient();

  // Validate both employees exist at this location
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('location_id', location.id)
    .in('id', [leaderId, employeeId]);

  if (employeesError) {
    console.error('[native] Failed to validate employees', employeesError);
    return res.status(500).json({ error: 'Failed to validate employees' });
  }

  if (!employeesData || employeesData.length < 2) {
    return res.status(400).json({ error: 'Leader or employee is not valid for this location' });
  }

  // Look up infraction rubric - org-level first, then location-specific
  let rubric: { action: string; points: number | null } | null = null;

  if (location.org_id) {
    const { data: orgRubric, error: orgRubricError } = await supabase
      .from('infractions_rubric')
      .select('action, points')
      .eq('org_id', location.org_id)
      .is('location_id', null)
      .eq('id', infractionId)
      .maybeSingle();

    if (!orgRubricError && orgRubric) {
      rubric = orgRubric;
    }
  }

  if (!rubric) {
    const { data: locationRubric, error: locationRubricError } = await supabase
      .from('infractions_rubric')
      .select('action, points')
      .eq('location_id', location.id)
      .eq('id', infractionId)
      .maybeSingle();

    if (locationRubricError) {
      console.error('[native] Failed to fetch infractions rubric', locationRubricError);
      return res.status(500).json({ error: 'Failed to load infraction details' });
    }

    rubric = locationRubric;
  }

  if (!rubric) {
    return res.status(400).json({ error: 'Invalid infraction selected' });
  }

  const employeeRecord = employeesData.find((emp) => emp.id === employeeId);

  // Use provided date or default to today
  const dateToUse =
    infractionDate && /^\d{4}-\d{2}-\d{2}$/.test(infractionDate)
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
    console.error('[native] Failed to insert infraction', insertError);
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

export default withPermissionAndContext(P.DISC_SUBMIT_INFRACTIONS, handler);
