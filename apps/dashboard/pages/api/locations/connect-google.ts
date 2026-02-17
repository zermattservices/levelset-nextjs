import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncLocationFromGoogle } from '@/lib/google-places';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/locations/connect-google
 * Body: { locationId: string, placeId: string, googleMapsUrl?: string }
 *
 * Connects a location to a Google Maps Place by fetching place details,
 * syncing business hours, and importing reviews.
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

  const { locationId, placeId, googleMapsUrl } = req.body;

  if (!locationId || !placeId) {
    return res.status(400).json({ error: 'locationId and placeId are required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Verify the location exists and get org_id
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('id, org_id, google_place_id')
      .eq('id', locationId)
      .single();

    if (locError || !location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (location.google_place_id) {
      return res.status(400).json({
        error: 'Location is already connected to Google Maps. Disconnect first to reconnect.',
      });
    }

    const result = await syncLocationFromGoogle(
      supabase,
      locationId,
      placeId,
      location.org_id,
      googleMapsUrl
    );

    return res.status(200).json({
      success: true,
      message: 'Location connected to Google Maps',
      ...result,
    });
  } catch (error: any) {
    console.error('[connect-google] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to connect location to Google Maps',
    });
  }
}
