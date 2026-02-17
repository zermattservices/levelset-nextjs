import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncPlaceDetailsFromGoogle } from '@/lib/google-places';
import { findAndConnectYelpBusiness } from '@/lib/yelp-places';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/locations/connect-google
 * Body: { locationId: string, placeId: string, googleMapsUrl?: string }
 *
 * Phase 1 only: Connects a location to a Google Maps Place by fetching
 * place details and syncing business hours. Returns immediately (~1-2s).
 * Reviews are synced separately via /api/locations/sync-google.
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

    // Phase 1: place details + hours only (fast)
    const result = await syncPlaceDetailsFromGoogle(
      supabase,
      locationId,
      placeId,
      location.org_id,
      googleMapsUrl
    );

    // Phase 1b: Find matching Yelp business (non-blocking — failure doesn't break Google connect)
    let yelp: { found: boolean; bizId: string | null; rating: number | null; reviewCount: number | null } = {
      found: false, bizId: null, rating: null, reviewCount: null,
    };

    if (result.displayName && result.formattedAddress) {
      try {
        yelp = await findAndConnectYelpBusiness(
          supabase,
          locationId,
          result.displayName,
          result.formattedAddress,
          location.org_id
        );
      } catch (yelpError: any) {
        console.error('[connect-google] Yelp search failed (non-fatal):', yelpError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Location connected to Google Maps',
      ...result,
      yelp,
    });
  } catch (error: any) {
    console.error('[connect-google] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to connect location to Google Maps',
    });
  }
}
