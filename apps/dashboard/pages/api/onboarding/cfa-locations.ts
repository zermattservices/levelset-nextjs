/**
 * GET /api/onboarding/cfa-locations?q=05294
 *
 * Search the CFA location directory by store number (exact or prefix match).
 * Used during onboarding for prefilling location data.
 * No auth required (public endpoint for onboarding).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const query = q.trim();

  try {
    const supabase = createServerSupabaseClient();

    // Exact match on store number first, then prefix match
    const { data, error } = await supabase
      .from('cfa_location_directory')
      .select('location_name, location_number, operator_name, location_type, state')
      .or(`location_number.eq.${query},location_number.like.${query}%`)
      .order('location_number')
      .limit(10);

    if (error) {
      console.error('CFA location search error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    return res.status(200).json({ locations: data || [] });
  } catch (err) {
    console.error('CFA location search error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
