import { SupabaseClient } from '@supabase/supabase-js';

// Google Places API (New) v1 types

interface GooglePlaceLocation {
  latitude: number;
  longitude: number;
}

interface GooglePlaceDisplayName {
  text: string;
  languageCode: string;
}

interface GoogleLocalizedText {
  text: string;
  languageCode: string;
}

interface GoogleOpeningHoursPoint {
  day: number; // 0-6, 0=Sunday
  hour: number; // 0-23
  minute: number; // 0-59
}

interface GoogleOpeningHoursPeriod {
  open: GoogleOpeningHoursPoint;
  close?: GoogleOpeningHoursPoint;
}

interface GoogleRegularOpeningHours {
  openNow?: boolean;
  periods?: GoogleOpeningHoursPeriod[];
  weekdayDescriptions?: string[];
}

interface GoogleAuthorAttribution {
  displayName: string;
  uri: string;
  photoUri: string;
}

interface GoogleReviewResponse {
  name: string;
  rating: number;
  text?: GoogleLocalizedText;
  originalText?: GoogleLocalizedText;
  authorAttribution?: GoogleAuthorAttribution;
  publishTime: string;
  relativePublishTimeDescription?: string;
  googleMapsUri?: string;
}

export interface GooglePlaceDetails {
  id: string;
  displayName?: GooglePlaceDisplayName;
  formattedAddress?: string;
  location?: GooglePlaceLocation;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: GoogleRegularOpeningHours;
  reviews?: GoogleReviewResponse[];
  googleMapsUri?: string;
  businessStatus?: string;
}

/**
 * Fetch place details from the Google Places API (New) v1.
 */
export async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceDetails> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  const fieldMask = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'rating',
    'userRatingCount',
    'regularOpeningHours',
    'reviews',
    'googleMapsUri',
    'businessStatus',
  ].join(',');

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[google-places] API error:', response.status, errorText);
    throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Parse Google's regularOpeningHours.periods into our location_business_hours rows.
 */
export function parseBusinessHours(
  regularOpeningHours: GoogleRegularOpeningHours | undefined,
  locationId: string
): Array<{
  location_id: string;
  day_of_week: number;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
  period_index: number;
}> {
  if (!regularOpeningHours?.periods) return [];

  // Track period_index per day for multiple periods (e.g., lunch & dinner)
  const dayPeriodCounts: Record<number, number> = {};

  return regularOpeningHours.periods
    .filter((p) => p.close) // Skip "always open" entries that lack a close
    .map((period) => {
      const day = period.open.day;
      const periodIndex = dayPeriodCounts[day] || 0;
      dayPeriodCounts[day] = periodIndex + 1;

      return {
        location_id: locationId,
        day_of_week: day,
        open_hour: period.open.hour,
        open_minute: period.open.minute,
        close_hour: period.close!.hour,
        close_minute: period.close!.minute,
        period_index: periodIndex,
      };
    });
}

/**
 * Parse Google review objects into our google_reviews table rows.
 */
export function parseReviews(
  reviews: GoogleReviewResponse[] | undefined,
  locationId: string,
  orgId: string
): Array<{
  location_id: string;
  org_id: string;
  google_review_name: string;
  author_name: string | null;
  author_photo_url: string | null;
  author_uri: string | null;
  rating: number;
  review_text: string | null;
  review_language: string | null;
  original_text: string | null;
  original_language: string | null;
  publish_time: string;
  relative_time_description: string | null;
  google_maps_uri: string | null;
}> {
  if (!reviews) return [];

  return reviews.map((review) => ({
    location_id: locationId,
    org_id: orgId,
    google_review_name: review.name,
    author_name: review.authorAttribution?.displayName || null,
    author_photo_url: review.authorAttribution?.photoUri || null,
    author_uri: review.authorAttribution?.uri || null,
    rating: review.rating,
    review_text: review.text?.text || null,
    review_language: review.text?.languageCode || null,
    original_text: review.originalText?.text || null,
    original_language: review.originalText?.languageCode || null,
    publish_time: review.publishTime,
    relative_time_description: review.relativePublishTimeDescription || null,
    google_maps_uri: review.googleMapsUri || null,
  }));
}

/**
 * Shared sync logic: fetch place details from Google and write to database.
 * Used by both the connect endpoint and the cron job.
 *
 * Returns a summary of what was synced.
 */
export async function syncLocationFromGoogle(
  supabase: SupabaseClient,
  locationId: string,
  placeId: string,
  orgId: string,
  googleMapsUrl?: string
): Promise<{
  rating: number | null;
  reviewCount: number | null;
  hoursDisplay: string[] | null;
  newReviews: number;
  updatedReviews: number;
}> {
  // 1. Fetch place details from Google
  const place = await fetchPlaceDetails(placeId);

  // 2. Update location row with Google fields
  const { error: locError } = await supabase
    .from('locations')
    .update({
      google_place_id: placeId,
      latitude: place.location?.latitude || null,
      longitude: place.location?.longitude || null,
      google_maps_url: googleMapsUrl || place.googleMapsUri || null,
      google_rating: place.rating || null,
      google_review_count: place.userRatingCount || null,
      google_hours_display: place.regularOpeningHours?.weekdayDescriptions || null,
      google_last_synced_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  if (locError) {
    console.error('[google-places] Error updating location:', locError);
    throw new Error(`Failed to update location: ${locError.message}`);
  }

  // 3. Replace business hours (delete old, insert new)
  const { error: delHoursError } = await supabase
    .from('location_business_hours')
    .delete()
    .eq('location_id', locationId);

  if (delHoursError) {
    console.error('[google-places] Error deleting old hours:', delHoursError);
  }

  const hoursRows = parseBusinessHours(place.regularOpeningHours, locationId);
  if (hoursRows.length > 0) {
    const { error: insHoursError } = await supabase
      .from('location_business_hours')
      .insert(hoursRows);

    if (insHoursError) {
      console.error('[google-places] Error inserting hours:', insHoursError);
    }
  }

  // 4. Upsert reviews (insert new, update last_synced_at on existing)
  const reviewRows = parseReviews(place.reviews, locationId, orgId);
  let newReviews = 0;
  let updatedReviews = 0;

  for (const review of reviewRows) {
    const { data, error: upsertError } = await supabase
      .from('google_reviews')
      .upsert(
        {
          ...review,
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: 'location_id,google_review_name',
          ignoreDuplicates: false,
        }
      )
      .select('first_synced_at, last_synced_at');

    if (upsertError) {
      console.error('[google-places] Error upserting review:', upsertError);
      continue;
    }

    // If first_synced_at ~ last_synced_at (within 2 seconds), it's a new review
    if (data && data[0]) {
      const firstSynced = new Date(data[0].first_synced_at).getTime();
      const lastSynced = new Date(data[0].last_synced_at).getTime();
      if (Math.abs(lastSynced - firstSynced) < 2000) {
        newReviews++;
      } else {
        updatedReviews++;
      }
    }
  }

  return {
    rating: place.rating || null,
    reviewCount: place.userRatingCount || null,
    hoursDisplay: place.regularOpeningHours?.weekdayDescriptions || null,
    newReviews,
    updatedReviews,
  };
}
