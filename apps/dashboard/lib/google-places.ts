import { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchOutscraperReviews,
  fetchOutscraperReviewsAsync,
  mapOutscraperReviewToRow,
} from './outscraper';

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

  const t0 = Date.now();
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

  const data = await response.json();
  console.log(`[google-places] fetchPlaceDetails completed in ${Date.now() - t0}ms (reviews: ${data.userRatingCount || 0})`);
  return data;
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
 * Build the webhook URL for Outscraper async callbacks.
 * Includes locationId, orgId, and a secret for verification.
 */
function buildOutscraperWebhookUrl(locationId: string, orgId: string): string | null {
  // Use VERCEL_PROJECT_PRODUCTION_URL for production, VERCEL_URL for preview,
  // or fall back to localhost for development
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    (process.env.NODE_ENV === 'development' ? null : null);

  if (!host) {
    // In development, no public URL available — can't use webhooks
    return null;
  }

  const secret = process.env.CRON_SECRET || process.env.OUTSCRAPER_API_KEY;
  const params = new URLSearchParams({
    locationId,
    orgId,
    secret: secret || '',
  });

  return `https://${host}/api/webhooks/outscraper-reviews?${params.toString()}`;
}

/**
 * Phase 1: Fetch place details + hours from Google and write to database.
 * This is fast (~1-2s) and returns immediately so the UI can show the card.
 * Does NOT sync reviews — call syncReviewsFromGoogle separately for that.
 */
export async function syncPlaceDetailsFromGoogle(
  supabase: SupabaseClient,
  locationId: string,
  placeId: string,
  orgId: string,
  googleMapsUrl?: string
): Promise<{
  rating: number | null;
  reviewCount: number | null;
  hoursDisplay: string[] | null;
  displayName: string | null;
  formattedAddress: string | null;
}> {
  const place = await fetchPlaceDetails(placeId);

  // Update location row with Google fields
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

  // Replace business hours (delete old, insert new)
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

  return {
    rating: place.rating || null,
    reviewCount: place.userRatingCount || null,
    hoursDisplay: place.regularOpeningHours?.weekdayDescriptions || null,
    displayName: place.displayName?.text || null,
    formattedAddress: place.formattedAddress || null,
  };
}

/**
 * Phase 2: Sync reviews from Outscraper (or Google Places API fallback).
 * This can be slow (5-30s+) and should be called AFTER the card is displayed.
 *
 * Review sync strategy (optimized for minimal Outscraper credits):
 *   1. Google Places API gives us `userRatingCount` (total reviews) — free.
 *   2. We count how many Outscraper reviews we have in our DB for this location.
 *   3. If counts match → no new reviews → skip Outscraper (0 credits).
 *   4. If DB has 0 Outscraper reviews → first fetch → sync all reviews.
 *   5. If there's a delta → fetch only the new reviews with reviewsLimit = delta.
 *   6. Falls back to Google Places API 5-review set if Outscraper unavailable.
 */
export async function syncReviewsFromGoogle(
  supabase: SupabaseClient,
  locationId: string,
  placeId: string,
  orgId: string
): Promise<{
  newReviews: number;
  updatedReviews: number;
}> {
  // Re-fetch place details for reviews and review count
  const place = await fetchPlaceDetails(placeId);
  const googleReviewCount = place.userRatingCount || 0;

  let newReviews = 0;
  let updatedReviews = 0;

  try {
    // Count how many Outscraper reviews we already have for this location
    const { count: dbReviewCount } = await supabase
      .from('google_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .like('google_review_name', 'outscraper/%');

    const existingCount = dbReviewCount || 0;
    const delta = googleReviewCount - existingCount;

    console.log(
      `[google-places] Review count — Google: ${googleReviewCount}, DB (outscraper): ${existingCount}, delta: ${delta}`
    );

    if (existingCount > 0 && delta <= 0) {
      console.log('[google-places] No new reviews detected — skipping Outscraper (0 credits used)');
    } else {
      const isFirstFetch = existingCount === 0;
      const reviewsLimit = isFirstFetch ? 0 : Math.max(delta + 5, 10);

      let cutoff: number | undefined;
      if (!isFirstFetch) {
        const { data: latestReview } = await supabase
          .from('google_reviews')
          .select('publish_time')
          .eq('location_id', locationId)
          .like('google_review_name', 'outscraper/%')
          .order('publish_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestReview?.publish_time) {
          cutoff = Math.floor(new Date(latestReview.publish_time).getTime() / 1000);
        }
      }

      // Try sync Outscraper fetch
      console.log(
        `[google-places] Outscraper fetch (${isFirstFetch ? 'full' : 'incremental'}, limit=${reviewsLimit})`
      );

      const oscResult = await fetchOutscraperReviews(placeId, {
        reviewsLimit,
        cutoff,
        sort: 'newest',
      });

      if (oscResult && oscResult.reviews_data && oscResult.reviews_data.length > 0) {
        const oscRows = oscResult.reviews_data.map((r) =>
          mapOutscraperReviewToRow(r, locationId, orgId)
        );

        const dbT0 = Date.now();
        const BATCH_SIZE = 50;
        for (let i = 0; i < oscRows.length; i += BATCH_SIZE) {
          const batch = oscRows.slice(i, i + BATCH_SIZE).map((row) => ({
            ...row,
            last_synced_at: new Date().toISOString(),
          }));

          const { data: upsertedData, error: batchError } = await supabase
            .from('google_reviews')
            .upsert(batch, {
              onConflict: 'location_id,google_review_name',
              ignoreDuplicates: false,
            })
            .select('first_synced_at, last_synced_at');

          if (batchError) continue;
          if (upsertedData) {
            for (const row of upsertedData) {
              const firstSynced = new Date(row.first_synced_at).getTime();
              const lastSynced = new Date(row.last_synced_at).getTime();
              if (Math.abs(lastSynced - firstSynced) < 2000) newReviews++;
              else updatedReviews++;
            }
          }
        }
        console.log(`[google-places] DB upsert completed in ${Date.now() - dbT0}ms — ${newReviews} new, ${updatedReviews} updated reviews`);
      } else {
        console.log('[google-places] No Outscraper reviews returned');
      }
    }
  } catch (oscError) {
    console.error('[google-places] Review sync error:', oscError);
  }

  return { newReviews, updatedReviews };
}

/**
 * Full sync: place details + reviews in one call.
 * Used by the cron job and manual sync where we don't need the split.
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
  outscraper_async_submitted?: boolean;
}> {
  // 1. Fetch place details from Google (free — gives us rating, review count, hours)
  const place = await fetchPlaceDetails(placeId);
  const googleReviewCount = place.userRatingCount || 0;

  // 2. Update location row with Google fields
  const { error: locError } = await supabase
    .from('locations')
    .update({
      google_place_id: placeId,
      latitude: place.location?.latitude || null,
      longitude: place.location?.longitude || null,
      google_maps_url: googleMapsUrl || place.googleMapsUri || null,
      google_rating: place.rating || null,
      google_review_count: googleReviewCount || null,
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

  // 4. Smart review sync — compare Google count vs DB count to minimize credits
  let newReviews = 0;
  let updatedReviews = 0;
  let outscraper_async_submitted = false;

  try {
    // Count how many Outscraper reviews we already have for this location
    const { count: dbReviewCount } = await supabase
      .from('google_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .like('google_review_name', 'outscraper/%');

    const existingCount = dbReviewCount || 0;
    const delta = googleReviewCount - existingCount;

    console.log(
      `[google-places] Review count — Google: ${googleReviewCount}, DB (outscraper): ${existingCount}, delta: ${delta}`
    );

    // If we have all the reviews already, skip Outscraper entirely
    if (existingCount > 0 && delta <= 0) {
      console.log('[google-places] No new reviews detected — skipping Outscraper (0 credits used)');
    } else {
      // We need to fetch reviews from Outscraper
      const isFirstFetch = existingCount === 0;
      // For first fetch: get all reviews (unlimited)
      // For incremental: only fetch the delta + a small buffer for safety
      const reviewsLimit = isFirstFetch ? 0 : Math.max(delta + 5, 10);

      // Get cutoff timestamp from our latest Outscraper review
      let cutoff: number | undefined;
      if (!isFirstFetch) {
        const { data: latestReview } = await supabase
          .from('google_reviews')
          .select('publish_time')
          .eq('location_id', locationId)
          .like('google_review_name', 'outscraper/%')
          .order('publish_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestReview?.publish_time) {
          cutoff = Math.floor(new Date(latestReview.publish_time).getTime() / 1000);
        }
      }

      // Try async webhook mode first (preferred — avoids serverless timeouts)
      const webhookUrl = buildOutscraperWebhookUrl(locationId, orgId);

      if (webhookUrl) {
        // Use async mode — fire and forget, webhook handles DB writes
        console.log(
          `[google-places] Submitting async Outscraper fetch (${isFirstFetch ? 'full' : 'incremental'}, limit=${reviewsLimit}, cutoff=${cutoff || 'none'})`
        );

        try {
          const asyncResult = await fetchOutscraperReviewsAsync(placeId, webhookUrl, {
            reviewsLimit,
            cutoff,
          });

          if (asyncResult) {
            outscraper_async_submitted = true;
            console.log(`[google-places] Async request submitted: ${asyncResult.id}`);
          }
        } catch (asyncError) {
          console.error('[google-places] Async Outscraper failed, trying sync fallback:', asyncError);
        }
      }

      // If async wasn't available (dev) or failed, try synchronous fetch
      if (!outscraper_async_submitted) {
        console.log(
          `[google-places] Sync Outscraper fetch (${isFirstFetch ? 'full' : 'incremental'}, limit=${reviewsLimit})`
        );

        const oscResult = await fetchOutscraperReviews(placeId, {
          reviewsLimit,
          cutoff,
          sort: 'newest',
        });

        if (oscResult && oscResult.reviews_data && oscResult.reviews_data.length > 0) {
          const oscRows = oscResult.reviews_data.map((r) =>
            mapOutscraperReviewToRow(r, locationId, orgId)
          );

          const BATCH_SIZE = 50;
          for (let i = 0; i < oscRows.length; i += BATCH_SIZE) {
            const batch = oscRows.slice(i, i + BATCH_SIZE).map((row) => ({
              ...row,
              last_synced_at: new Date().toISOString(),
            }));

            const { data: upsertedData, error: batchError } = await supabase
              .from('google_reviews')
              .upsert(batch, {
                onConflict: 'location_id,google_review_name',
                ignoreDuplicates: false,
              })
              .select('first_synced_at, last_synced_at');

            if (batchError) {
              console.error('[google-places] Outscraper batch upsert error:', batchError);
              continue;
            }

            if (upsertedData) {
              for (const row of upsertedData) {
                const firstSynced = new Date(row.first_synced_at).getTime();
                const lastSynced = new Date(row.last_synced_at).getTime();
                if (Math.abs(lastSynced - firstSynced) < 2000) {
                  newReviews++;
                } else {
                  updatedReviews++;
                }
              }
            }
          }

          console.log(`[google-places] Outscraper sync: ${newReviews} new, ${updatedReviews} updated reviews`);
        } else {
          console.log('[google-places] No Outscraper reviews returned');
        }
      }
    }
  } catch (oscError) {
    console.error('[google-places] Outscraper error:', oscError);
  }

  return {
    rating: place.rating || null,
    reviewCount: place.userRatingCount || null,
    hoursDisplay: place.regularOpeningHours?.weekdayDescriptions || null,
    newReviews,
    updatedReviews,
    outscraper_async_submitted,
  };
}
