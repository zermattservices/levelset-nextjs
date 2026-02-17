import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/locations/disconnect-google
 * Body: { locationId: string }
 *
 * Disconnects a location from Google Maps.
 * Clears Google fields and business hours. Preserves reviews (historical data).
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

    // Clear Google fields on location
    const { error: updateError } = await supabase
      .from('locations')
      .update({
        google_place_id: null,
        latitude: null,
        longitude: null,
        google_maps_url: null,
        google_rating: null,
        google_review_count: null,
        google_hours_display: null,
        google_last_synced_at: null,
      })
      .eq('id', locationId);

    if (updateError) {
      throw new Error(`Failed to update location: ${updateError.message}`);
    }

    // Delete business hours
    const { error: delError } = await supabase
      .from('location_business_hours')
      .delete()
      .eq('location_id', locationId);

    if (delError) {
      console.error('[disconnect-google] Error deleting hours:', delError);
    }

    return res.status(200).json({
      success: true,
      message: 'Location disconnected from Google Maps. Reviews have been preserved.',
    });
  } catch (error: any) {
    console.error('[disconnect-google] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to disconnect location from Google Maps',
    });
  }
}
