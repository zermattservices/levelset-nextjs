/**
 * POST /api/onboarding/google-search
 *
 * Search Google Places API (New) v1 for a location by text query.
 * Used during onboarding to find and confirm CFA restaurant details.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  hoursDisplay: string[] | null;
  rating: number | null;
  userRatingCount: number | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return res.status(400).json({ error: 'Search query must be at least 3 characters' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  try {
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.googleMapsUri',
      'places.regularOpeningHours',
      'places.rating',
      'places.userRatingCount',
    ].join(',');

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        textQuery: query.trim(),
        maxResultCount: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places search error:', response.status, errorText);
      return res.status(502).json({ error: 'Google Places search failed' });
    }

    const data = await response.json();
    const places: PlaceResult[] = (data.places || []).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      latitude: place.location?.latitude || null,
      longitude: place.location?.longitude || null,
      googleMapsUrl: place.googleMapsUri || null,
      hoursDisplay: place.regularOpeningHours?.weekdayDescriptions || null,
      rating: place.rating || null,
      userRatingCount: place.userRatingCount || null,
    }));

    return res.status(200).json({ places });
  } catch (err) {
    console.error('Google search error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
