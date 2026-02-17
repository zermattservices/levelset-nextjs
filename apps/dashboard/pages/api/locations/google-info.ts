import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/locations/google-info?locationId=...
 *
 * Returns Google Maps data for a location: Google fields, business hours, and reviews.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const locationId = req.query.locationId as string;

  if (!locationId) {
    return res.status(400).json({ error: 'locationId query parameter is required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Fetch location Google + Yelp fields
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select(
        'id, google_place_id, latitude, longitude, google_maps_url, google_rating, google_review_count, google_hours_display, google_last_synced_at, yelp_biz_id, yelp_business_url, yelp_rating, yelp_review_count, yelp_last_synced_at'
      )
      .eq('id', locationId)
      .single();

    if (locError || !location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (!location.google_place_id) {
      return res.status(200).json({
        connected: false,
        location: null,
        businessHours: [],
        reviews: [],
      });
    }

    // Fetch business hours
    const { data: businessHours } = await supabase
      .from('location_business_hours')
      .select('*')
      .eq('location_id', locationId)
      .order('day_of_week', { ascending: true })
      .order('period_index', { ascending: true });

    // Fetch Google reviews
    const { data: reviews } = await supabase
      .from('google_reviews')
      .select('*')
      .eq('location_id', locationId)
      .order('publish_time', { ascending: false });

    // Fetch Yelp reviews
    const { data: yelpReviews } = await supabase
      .from('yelp_reviews')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    return res.status(200).json({
      connected: true,
      location,
      businessHours: businessHours || [],
      reviews: reviews || [],
      yelpReviews: yelpReviews || [],
    });
  } catch (error: any) {
    console.error('[google-info] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch Google Maps info',
    });
  }
}
