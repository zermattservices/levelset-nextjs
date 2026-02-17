/**
 * Outscraper API integration for fetching all Google Maps reviews.
 *
 * The Google Places API (v1) only returns 5 "most relevant" reviews.
 * Outscraper scrapes all reviews from Google Maps, supporting:
 *   - Full fetch on first connect (reviewsLimit=0 for unlimited, synchronous)
 *   - Incremental async updates via webhook when new reviews are detected
 *
 * Credit optimization strategy:
 *   1. Google Places API provides `userRatingCount` (free on every sync)
 *   2. We compare that against our DB review count for the location
 *   3. If counts match → skip Outscraper entirely (0 credits used)
 *   4. If there's a delta → fetch only the delta with `reviewsLimit` + `sort=newest`
 *   5. Re-syncs use async mode + webhook for realtime ingestion
 *
 * API docs: https://outscraper.com/google-maps-reviews-api/
 * Endpoint: GET https://api.outscraper.cloud/google-maps-reviews
 */

export interface OutscraperReview {
  google_id: string;
  author_link: string | null;
  author_title: string; // author display name
  author_id: string;
  author_image: string | null;
  review_text: string | null;
  review_img_url: string | null;
  review_img_urls: string[] | null;
  owner_answer: string | null;
  owner_answer_timestamp: number | null;
  owner_answer_timestamp_datetime_utc: string | null;
  review_link: string | null;
  review_rating: number;
  review_timestamp: number; // unix epoch seconds
  review_datetime_utc: string; // "MM/DD/YYYY HH:MM:SS"
  review_likes: number;
  reviews_id: string;
  review_pagination_id: string;
}

export interface OutscraperPlaceResult {
  name: string;
  full_address: string;
  rating: number;
  reviews: number; // total review count
  reviews_data: OutscraperReview[];
  google_id: string;
  place_id: string;
}

export interface OutscraperResponse {
  id: string;
  status: string;
  data: OutscraperPlaceResult[];
}

/** Response from async submission (status 202) */
export interface OutscraperAsyncResponse {
  id: string;
  status: 'Pending';
  results_location: string;
}

/**
 * Fetch reviews from Outscraper synchronously (blocks until complete).
 * Use for first-time full fetches where we need immediate results.
 *
 * @param placeId - The Google Place ID
 * @param options.reviewsLimit - Max reviews to fetch (0 = unlimited). Default 0.
 * @param options.cutoff - Unix timestamp. Only fetch reviews newer than this.
 * @param options.sort - Sort order. Default "newest".
 */
export async function fetchOutscraperReviews(
  placeId: string,
  options: {
    reviewsLimit?: number;
    cutoff?: number;
    sort?: 'most_relevant' | 'newest' | 'highest_rating' | 'lowest_rating';
  } = {}
): Promise<OutscraperPlaceResult | null> {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    console.warn('[outscraper] OUTSCRAPER_API_KEY not configured, skipping review fetch');
    return null;
  }

  const { reviewsLimit = 0, cutoff, sort } = options;

  const params = new URLSearchParams({
    query: placeId,
    reviewsLimit: String(reviewsLimit),
    async: 'false', // synchronous — wait for results
    sort: sort || 'newest',
  });

  if (cutoff) {
    params.set('cutoff', String(cutoff));
  }

  const t0 = Date.now();
  console.log(`[outscraper] Sync fetch for ${placeId} (limit=${reviewsLimit}, cutoff=${cutoff || 'none'})`);

  const response = await fetch(
    `https://api.outscraper.cloud/google-maps-reviews?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[outscraper] API error:', response.status, errorText);
    throw new Error(`Outscraper API error: ${response.status} - ${errorText}`);
  }

  const result: OutscraperResponse = await response.json();
  const elapsedMs = Date.now() - t0;

  if (!result.data || result.data.length === 0) {
    console.warn(`[outscraper] No place data returned (${elapsedMs}ms)`);
    return null;
  }

  const place = result.data[0];
  const reviewCount = place.reviews_data?.length || 0;
  const msPerReview = reviewCount > 0 ? Math.round(elapsedMs / reviewCount) : 0;
  console.log(`[outscraper] Fetched ${reviewCount} reviews for "${place.name}" in ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s, ${msPerReview}ms/review)`);

  return place;
}

/**
 * Submit an async Outscraper review fetch with a webhook callback.
 * Returns immediately with a request ID. Outscraper will POST results
 * to the webhook URL when scraping completes (typically 1-3 minutes).
 *
 * Use this for incremental updates where we don't need to block the
 * response. The webhook endpoint handles writing reviews to the DB.
 *
 * @param placeId - The Google Place ID
 * @param webhookUrl - URL that Outscraper will POST results to
 * @param options.reviewsLimit - Max reviews to fetch. Should be set to the delta.
 * @param options.cutoff - Unix timestamp cutoff for incremental fetches.
 */
export async function fetchOutscraperReviewsAsync(
  placeId: string,
  webhookUrl: string,
  options: {
    reviewsLimit?: number;
    cutoff?: number;
  } = {}
): Promise<OutscraperAsyncResponse | null> {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    console.warn('[outscraper] OUTSCRAPER_API_KEY not configured, skipping async review fetch');
    return null;
  }

  const { reviewsLimit = 0, cutoff } = options;

  const params = new URLSearchParams({
    query: placeId,
    reviewsLimit: String(reviewsLimit),
    async: 'true',
    sort: 'newest',
    webhook: webhookUrl,
  });

  if (cutoff) {
    params.set('cutoff', String(cutoff));
  }

  console.log(`[outscraper] Async fetch for ${placeId} (limit=${reviewsLimit}, cutoff=${cutoff || 'none'}, webhook=${webhookUrl})`);

  const response = await fetch(
    `https://api.outscraper.cloud/google-maps-reviews?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[outscraper] Async API error:', response.status, errorText);
    throw new Error(`Outscraper async API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`[outscraper] Async request submitted, id=${result.id}`);

  return result as OutscraperAsyncResponse;
}

/**
 * Convert an Outscraper review into a row compatible with our google_reviews table.
 *
 * We generate a deterministic `google_review_name` from the author_id + review_timestamp
 * so it's unique per review and compatible with our existing upsert logic.
 * Outscraper reviews use a different key format than the Google Places API,
 * prefixed with "outscraper/" to avoid collisions.
 */
export function mapOutscraperReviewToRow(
  review: OutscraperReview,
  locationId: string,
  orgId: string
): {
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
} {
  // Generate a unique key: outscraper/{author_id}/{review_timestamp}
  const reviewName = `outscraper/${review.author_id}/${review.review_timestamp}`;

  // Convert unix timestamp to ISO string
  const publishTime = new Date(review.review_timestamp * 1000).toISOString();

  return {
    location_id: locationId,
    org_id: orgId,
    google_review_name: reviewName,
    author_name: review.author_title || null,
    author_photo_url: review.author_image || null,
    author_uri: review.author_link || null,
    rating: review.review_rating,
    review_text: review.review_text || null,
    review_language: null, // Outscraper doesn't provide language
    original_text: null,
    original_language: null,
    publish_time: publishTime,
    relative_time_description: null,
    google_maps_uri: review.review_link || null,
  };
}
