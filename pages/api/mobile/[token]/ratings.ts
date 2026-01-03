import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface RatingsRequestBody {
  leaderId?: string;
  employeeId?: string;
  position?: string;
  ratings?: number[];
  notes?: string | null;
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

  const body: RatingsRequestBody = req.body ?? {};
  const { leaderId, employeeId, position, ratings, notes } = body;

  if (!leaderId || !employeeId || !position || !Array.isArray(ratings)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (ratings.length !== 5 || ratings.some((value) => typeof value !== 'number' || value < 1 || value > 5)) {
    return res.status(400).json({ error: 'Ratings must include five values between 1 and 5' });
  }

  const location = await fetchLocationByToken(token);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  if (!location.org_id) {
    return res.status(500).json({ error: 'Location is missing org reference' });
  }

  const supabase = createServerSupabaseClient();

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('location_id', location.id)
    .in('id', [leaderId, employeeId]);

  if (employeesError) {
    console.error('[mobile] Failed to validate employees for token', token, employeesError);
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
    console.error('[mobile] Failed to insert rating for token', token, insertError);
    return res.status(500).json({ error: 'Failed to submit rating' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    ratingId: inserted?.id ?? null,
    employeeName: employeeRecord?.full_name ?? null,
    position,
  });
}

