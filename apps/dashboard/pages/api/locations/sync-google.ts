import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncLocationFromGoogle } from '@/lib/google-places';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/locations/sync-google
 * Body: { locationId: string }
 *
 * Manually triggers a sync of Google Maps data (hours, rating, reviews) for a location.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { locationId } = req.body;

  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Look up the location's Google Place ID
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('id, org_id, google_place_id')
      .eq('id', locationId)
      .single();

    if (locError || !location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (!location.google_place_id) {
      return res.status(400).json({ error: 'Location is not connected to Google Maps' });
    }

    const startMs = Date.now();
    console.log(`[sync-google] Starting sync for location=${locationId}, placeId=${location.google_place_id}`);

    const result = await syncLocationFromGoogle(
      supabase,
      locationId,
      location.google_place_id,
      location.org_id
    );

    const totalMs = Date.now() - startMs;
    console.log(`[sync-google] Complete in ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s) — reviewCount=${result.reviewCount}, newReviews=${result.newReviews}, updatedReviews=${result.updatedReviews}`);

    return res.status(200).json({
      success: true,
      message: 'Google Maps data synced',
      durationMs: totalMs,
      ...result,
    });
  } catch (error: any) {
    console.error('[sync-google] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to sync Google Maps data',
    });
  }
}
