/**
 * Native Form API: Submit Ratings
 * POST /api/native/forms/ratings
 *
 * Authenticated version of /api/mobile/[token]/ratings
 * Submits a positional rating for an employee.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

interface RatingsRequestBody {
  location_id?: string;
  leaderId?: string;
  employeeId?: string;
  position?: string;
  ratings?: number[];
  notes?: string | null;
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

  const body: RatingsRequestBody = req.body ?? {};
  const { location_id: locationId, leaderId, employeeId, position, ratings, notes } = body;

  if (!locationId) {
    return res.status(400).json({ error: 'Missing location_id' });
  }

  if (!leaderId || !employeeId || !position || !Array.isArray(ratings)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (ratings.length !== 5 || ratings.some((value) => typeof value !== 'number' || value < 1 || value > 5)) {
    return res.status(400).json({ error: 'Ratings must include five values between 1 and 5' });
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
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('location_id', location.id)
    .in('id', [leaderId, employeeId]);

  if (employeesError) {
    console.error('[native] Failed to validate employees', employeesError);
    return res.status(500).json({ error: 'Failed to validate employees' });
  }

  if (!employees || employees.length < 2) {
    return res.status(400).json({ error: 'Leader or employee is not valid for this location' });
  }

  const employeeRecord = employees.find((emp) => emp.id === employeeId);

  const { data: inserted, error: insertError } = await supabase
    .from('ratings')
    .insert({
      employee_id: employeeId,
      rater_user_id: leaderId,
      position,
      rating_1: ratings[0],
      rating_2: ratings[1],
      rating_3: ratings[2],
      rating_4: ratings[3],
      rating_5: ratings[4],
      location_id: location.id,
      org_id: location.org_id,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[native] Failed to insert rating', insertError);
    return res.status(500).json({ error: 'Failed to submit rating' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    ratingId: inserted?.id ?? null,
    employeeName: employeeRecord?.full_name ?? null,
    position,
  });
}

export default withPermissionAndContext(P.PE_SUBMIT_RATINGS, handler);
