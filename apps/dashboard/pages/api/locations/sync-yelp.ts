import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchPlaceDetails } from '@/lib/google-places';
import { findAndConnectYelpBusiness, syncReviewsFromYelp } from '@/lib/yelp-places';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/locations/sync-yelp
 * Body: { locationId: string }
 *
 * Syncs Yelp reviews for a location via Outscraper.
 * If the location isn't connected to Yelp yet, attempts to find and
 * connect the matching Yelp business first using the Google Place's
 * display name and formatted address (NOT the internal location name).
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

    // Look up location — need google_place_id for Yelp search fallback
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('id, org_id, yelp_biz_id, google_place_id')
      .eq('id', locationId)
      .single();

    if (locError || !location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    let yelpBizId = location.yelp_biz_id;

    // If not connected to Yelp yet, try to find and connect
    if (!yelpBizId) {
      if (!location.google_place_id) {
        return res.status(200).json({
          success: true,
          message: 'Yelp business not found — no Google Place connected',
          connected: false,
          newReviews: 0,
          updatedReviews: 0,
        });
      }

      // Fetch the Google display name + formatted address from Google Places API
      // This gives us "Chick-fil-A" instead of "Buda FSU" (the internal name)
      let displayName: string | null = null;
      let formattedAddress: string | null = null;

      try {
        const place = await fetchPlaceDetails(location.google_place_id);
        displayName = place.displayName?.text || null;
        formattedAddress = place.formattedAddress || null;
      } catch (err: any) {
        console.error('[sync-yelp] Failed to fetch Google Place details:', err.message);
      }

      if (!displayName || !formattedAddress) {
        return res.status(200).json({
          success: true,
          message: 'Yelp business not found — could not get Google Place name/address',
          connected: false,
          newReviews: 0,
          updatedReviews: 0,
        });
      }

      console.log(`[sync-yelp] No yelp_biz_id — searching for "${displayName}" at "${formattedAddress}"`);

      const yelpResult = await findAndConnectYelpBusiness(
        supabase,
        locationId,
        displayName,
        formattedAddress,
        location.org_id
      );

      if (!yelpResult.found || !yelpResult.bizId) {
        return res.status(200).json({
          success: true,
          message: 'Yelp business not found for this location',
          connected: false,
          newReviews: 0,
          updatedReviews: 0,
        });
      }

      yelpBizId = yelpResult.bizId;
      console.log(`[sync-yelp] Found and connected Yelp business: ${yelpBizId}`);
    }

    const startMs = Date.now();
    console.log(`[sync-yelp] Starting sync for location=${locationId}, yelpBizId=${yelpBizId}`);

    const result = await syncReviewsFromYelp(
      supabase,
      locationId,
      yelpBizId,
      location.org_id
    );

    const totalMs = Date.now() - startMs;
    console.log(`[sync-yelp] Complete in ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s) — newReviews=${result.newReviews}, updatedReviews=${result.updatedReviews}`);

    return res.status(200).json({
      success: true,
      connected: true,
      message: 'Yelp reviews synced',
      durationMs: totalMs,
      ...result,
    });
  } catch (error: any) {
    console.error('[sync-yelp] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to sync Yelp reviews',
    });
  }
}
