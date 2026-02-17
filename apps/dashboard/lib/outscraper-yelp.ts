/**
 * Outscraper Yelp API integration for finding businesses and fetching reviews.
 *
 * Uses the same OUTSCRAPER_API_KEY as the Google Maps integration.
 *
 * Search strategy: Outscraper's /yelp-search endpoint hangs when given a Yelp
 * search URL with find_desc + find_loc. Instead, we use a three-step approach:
 *   1. Google Search (site:yelp.com/biz) to find candidate Yelp business URLs
 *   2. Outscraper /yelp-biz to fetch business details for each candidate
 *   3. Address verification: compare Yelp address against Google address (zip code match)
 *
 * Endpoints used:
 *   - /google-search-v3: Find the Yelp URL via Google
 *   - /yelp-biz: Get business details from a known Yelp URL
 *   - /yelp-reviews: Fetch reviews for a Yelp business
 *
 * API docs: https://outscraper.com/yelp-scraper/
 */

// ── Types ──

export interface OutscraperYelpSearchResult {
  query: string;
  biz_id: string;
  name: string;
  price_range: string;
  rating: number;
  reviews: number;
  categories: string[];
  formatted_dddress: string; // NOTE: typo is in the actual Outscraper /yelp-search API
  full_address?: string;
  address_lines?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  neighborhoods: string[];
  phone: string;
  business_url: string;
  company_url?: string;
  services: string[];
  photo: string;
  tags: string[];
  snippet: string | null;
}

export interface OutscraperYelpReview {
  query: string;
  business_name: string;
  review_rating: number;
  review_text: string;
  review_photos: string[];
  review_tags: Record<string, number> | string[];
  owner_replies: string[];
  owner_reply?: string | null;
  owner_reply_datetime_utc?: string | null;
  review_id: string;
  author_title?: string;
  author_id?: string;
  author_image?: string;
  author_link?: string;
  datetime_utc?: string; // e.g. "05/31/2025 02:17:29"
  timestamp?: number;    // Unix timestamp in seconds
}

interface OutscraperYelpReviewsResponse {
  id: string;
  status: string;
  data: OutscraperYelpReview[][]; // nested array
}

// ── Helpers ──

function extractCityState(address: string): { city: string; state: string } {
  const parts = address.split(',').map(p => p.trim());

  // Google formatted addresses often end with country: "Buda, TX 78610, USA"
  // Filter out country-only parts (e.g., "USA", "US")
  const filtered = parts.filter(p => !/^(USA|US|United States)$/i.test(p));

  if (filtered.length >= 2) {
    // The second-to-last part after filtering is usually "State Zip" e.g., "TX 78610"
    const stateZipPart = filtered[filtered.length - 1];
    const state = stateZipPart.match(/([A-Z]{2})/)?.[1] || '';
    // City is the part before state+zip
    const city = filtered.length >= 3 ? filtered[filtered.length - 2] : filtered[0];
    return { city, state };
  }
  return { city: filtered[0] || '', state: '' };
}

/**
 * Extract a 5-digit zip code from an address string.
 * Looks for a zip code near a state abbreviation (e.g., "TX 78610") to avoid
 * matching street numbers like "15500" which are also 5 digits.
 */
function extractZipCode(address: string): string | null {
  // First try: zip code after state abbreviation (most reliable)
  const stateZipMatch = address.match(/[A-Z]{2}\s+(\d{5})\b/);
  if (stateZipMatch) return stateZipMatch[1];

  // Fallback: any 5-digit number that appears after a comma (likely zip, not street number)
  const afterComma = address.match(/,\s*[^,]*\b(\d{5})\b/);
  if (afterComma) return afterComma[1];

  // Last resort: last 5-digit number in the string
  const allMatches = address.match(/\b(\d{5})\b/g);
  return allMatches ? allMatches[allMatches.length - 1] : null;
}

/**
 * Extract the street number (first numeric sequence) from an address.
 * "15500 S Interstate 35, Buda, TX 78610" → "15500"
 * "3600 Ranch Road 620 S" → "3600"
 */
function extractStreetNumber(address: string): string | null {
  // Match the first number at the start of an address line
  const match = address.match(/^\s*(\d+)\b/m);
  return match ? match[1] : null;
}

/**
 * Verify that a Yelp business address matches the expected Google address.
 *
 * Strategy: match street number + zip code. This reliably identifies the
 * exact location even when there are multiple branches in the same zip code,
 * without requiring a perfect full-address string match (which often differs
 * between Google and Yelp in formatting, abbreviations, etc.).
 *
 * Falls back to zip-only or city match if street number isn't available.
 */
function verifyAddressMatch(
  yelpBiz: OutscraperYelpSearchResult,
  googleAddress: string
): boolean {
  // Build Yelp address from available fields
  const yelpFullAddress = yelpBiz.full_address
    || yelpBiz.address_lines
    || yelpBiz.formatted_dddress
    || '';

  const googleZip = extractZipCode(googleAddress);
  const yelpZip = yelpBiz.zip_code || extractZipCode(yelpFullAddress);
  const googleStreetNum = extractStreetNumber(googleAddress);
  const yelpStreetNum = extractStreetNumber(yelpFullAddress);

  // Best case: both street number and zip code match
  if (googleZip && yelpZip && googleStreetNum && yelpStreetNum) {
    const zipMatch = googleZip === yelpZip;
    const streetMatch = googleStreetNum === yelpStreetNum;
    const result = zipMatch && streetMatch;
    console.log(`[outscraper-yelp] Address verify: street ${googleStreetNum} vs ${yelpStreetNum}, zip ${googleZip} vs ${yelpZip} → ${result ? 'MATCH' : 'NO MATCH'}`);
    return result;
  }

  // Fallback: zip code + city match
  if (googleZip && yelpZip) {
    const { city: googleCity } = extractCityState(googleAddress);
    const yelpCity = yelpBiz.city || '';
    const zipMatch = googleZip === yelpZip;
    const cityMatch = googleCity && yelpCity
      ? googleCity.toLowerCase() === yelpCity.toLowerCase()
      : true; // if we can't check city, accept zip-only match
    const result = zipMatch && cityMatch;
    console.log(`[outscraper-yelp] Address verify (zip+city): zip ${googleZip} vs ${yelpZip}, city "${googleCity}" vs "${yelpCity}" → ${result ? 'MATCH' : 'NO MATCH'}`);
    return result;
  }

  // Last resort: city match only
  const { city: googleCity } = extractCityState(googleAddress);
  const yelpCity = yelpBiz.city || '';
  if (googleCity && yelpCity) {
    const match = googleCity.toLowerCase() === yelpCity.toLowerCase();
    console.log(`[outscraper-yelp] Address verify (city only): "${googleCity}" vs "${yelpCity}" → ${match ? 'MATCH' : 'NO MATCH'}`);
    return match;
  }

  console.log('[outscraper-yelp] Address verify: insufficient data to verify, rejecting');
  return false;
}

// ── Search ──

/**
 * Find candidate Yelp business URLs by searching Google for `site:yelp.com/biz`.
 * Returns up to 3 candidate URLs for address verification.
 */
async function findYelpCandidatesViaGoogle(
  apiKey: string,
  businessName: string,
  address: string
): Promise<string[]> {
  const { city, state } = extractCityState(address);
  const zip = extractZipCode(address);

  // Include zip code in the query for precision (especially for chains in large cities)
  const locationPart = zip
    ? `${city} ${state} ${zip}`
    : (state ? `${city}, ${state}` : city);

  const query = `site:yelp.com/biz ${businessName} ${locationPart}`;
  console.log(`[outscraper-yelp] Google search: "${query}"`);

  const params = new URLSearchParams({ query, num: '5', async: 'false' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s for Google search

  try {
    const response = await fetch(
      `https://api.outscraper.cloud/google-search-v3?${params.toString()}`,
      { headers: { 'X-API-KEY': apiKey }, signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[outscraper-yelp] Google search HTTP ${response.status}`);
      return [];
    }

    const result = await response.json();
    const organic = result.data?.[0]?.organic_results;
    if (!organic || organic.length === 0) {
      console.log('[outscraper-yelp] No Google results for Yelp search');
      return [];
    }

    const candidates: string[] = [];
    const seen = new Set<string>();

    for (const r of organic) {
      const link: string = r.link || r.url || '';
      const yelpBizMatch = link.match(/https?:\/\/(?:(?:www|m)\.)?yelp\.com\/biz\/([a-z0-9-]+)/i);
      if (yelpBizMatch) {
        const slug = yelpBizMatch[1];
        if (!seen.has(slug)) {
          seen.add(slug);
          candidates.push(`https://www.yelp.com/biz/${slug}`);
          console.log(`[outscraper-yelp] Google candidate: https://www.yelp.com/biz/${slug}`);
        }
      }
    }

    if (candidates.length === 0) {
      console.log('[outscraper-yelp] No yelp.com/biz/ URLs in Google results');
    }

    return candidates;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('[outscraper-yelp] Google search timed out after 25s');
    } else {
      console.error('[outscraper-yelp] Google search error:', err.message);
    }
    return [];
  }
}

/**
 * Fetch Yelp business details from a known Yelp URL via /yelp-biz.
 * This is fast (~1-2s) and reliable.
 */
async function fetchYelpBizDetails(
  apiKey: string,
  yelpUrl: string
): Promise<OutscraperYelpSearchResult | null> {
  const params = new URLSearchParams({ query: yelpUrl, async: 'false' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000); // 35s — some slugs take 20-30s

  try {
    const response = await fetch(
      `https://api.outscraper.cloud/yelp-biz?${params.toString()}`,
      { headers: { 'X-API-KEY': apiKey }, signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[outscraper-yelp] /yelp-biz HTTP ${response.status}`);
      return null;
    }

    const result = await response.json();
    // /yelp-biz returns data[0] as a single object (not nested array like /yelp-search)
    const biz = result.data?.[0];
    if (!biz || !biz.biz_id) return null;

    // Normalize to match OutscraperYelpSearchResult shape
    return {
      ...biz,
      business_url: biz.company_url || yelpUrl,
      reviews: biz.reviews || 0,
      rating: biz.rating || 0,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('[outscraper-yelp] /yelp-biz timed out after 35s');
    } else {
      console.error('[outscraper-yelp] /yelp-biz error:', err.message);
    }
    return null;
  }
}

/**
 * Search for a Yelp business by name and address with address verification.
 *
 * Uses a three-step approach:
 *   1. Google Search (site:yelp.com/biz) to find candidate Yelp URLs
 *   2. Outscraper /yelp-biz to fetch business details for each candidate
 *   3. Address verification: compare zip codes to ensure correct location match
 *
 * This avoids the Outscraper /yelp-search endpoint which hangs when given
 * Yelp search URLs with find_desc + find_loc parameters.
 *
 * @param businessName - The business name from Google Places (e.g., "Chick-fil-A")
 * @param formattedAddress - Full address from Google Places (e.g., "15500 S Interstate 35, Buda, TX 78610, USA")
 * @returns The verified Yelp business result, or null if not found or no address match
 */
export async function searchYelpBusiness(
  businessName: string,
  formattedAddress: string
): Promise<OutscraperYelpSearchResult | null> {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    console.warn('[outscraper-yelp] OUTSCRAPER_API_KEY not configured, skipping Yelp search');
    return null;
  }

  const t0 = Date.now();
  console.log(`[outscraper-yelp] Searching for "${businessName}" at "${formattedAddress}"`);

  // Step 1: Find candidate Yelp URLs via Google
  const candidates = await findYelpCandidatesViaGoogle(apiKey, businessName, formattedAddress);
  if (candidates.length === 0) {
    console.log(`[outscraper-yelp] No Yelp candidates found via Google (${Date.now() - t0}ms)`);
    return null;
  }

  // Step 2+3: For each candidate, fetch details and verify address
  for (const candidateUrl of candidates) {
    const biz = await fetchYelpBizDetails(apiKey, candidateUrl);
    if (!biz) continue;

    // Verify the address matches
    if (verifyAddressMatch(biz, formattedAddress)) {
      const elapsedMs = Date.now() - t0;
      console.log(`[outscraper-yelp] ✅ Verified match: "${biz.name}" at ${biz.city}, ${biz.state} (${biz.reviews} reviews, ${biz.rating} rating) in ${elapsedMs}ms`);
      return biz;
    }

    console.log(`[outscraper-yelp] Candidate "${biz.name}" at ${biz.city} rejected — address mismatch`);
  }

  console.log(`[outscraper-yelp] No verified Yelp match found (checked ${candidates.length} candidates in ${Date.now() - t0}ms)`);
  return null;
}

/**
 * Fetch fresh business info (rating, review count) for a known Yelp URL.
 * Used by syncReviewsFromYelp to refresh the review count before
 * comparing against the DB count for credit optimization.
 *
 * Returns { rating, reviewCount } or null if the fetch fails.
 */
export async function fetchYelpBusinessInfo(
  yelpUrl: string
): Promise<{ rating: number; reviewCount: number } | null> {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) return null;

  const biz = await fetchYelpBizDetails(apiKey, yelpUrl);
  if (!biz) return null;

  return {
    rating: biz.rating || 0,
    reviewCount: biz.reviews || 0,
  };
}

// ── Reviews ──

/**
 * Fetch reviews for a Yelp business via Outscraper's /yelp-reviews (synchronous).
 *
 * @param bizIdOrSlug - Yelp business ID, slug, or URL
 * @param options.limit - Max reviews to fetch (0 = unlimited). Default 0.
 * @param options.sort - Sort order. Default "date_desc".
 * @param options.cutoff - Unix timestamp. Only fetch reviews newer than this.
 */
export async function fetchYelpReviews(
  bizIdOrSlug: string,
  options: {
    limit?: number;
    sort?: 'relevance_desc' | 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc' | 'elites_desc';
    cutoff?: number;
  } = {}
): Promise<OutscraperYelpReview[]> {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    console.warn('[outscraper-yelp] OUTSCRAPER_API_KEY not configured, skipping Yelp review fetch');
    return [];
  }

  const { limit = 0, sort = 'date_desc', cutoff } = options;

  const params = new URLSearchParams({
    query: bizIdOrSlug,
    limit: String(limit),
    async: 'false',
    sort,
  });

  if (cutoff) {
    params.set('cutoff', String(cutoff));
  }

  const t0 = Date.now();
  console.log(`[outscraper-yelp] Sync review fetch for ${bizIdOrSlug} (limit=${limit}, sort=${sort}, cutoff=${cutoff || 'none'})`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2min timeout for reviews

  let response: Response;
  try {
    response = await fetch(
      `https://api.outscraper.cloud/yelp-reviews?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error(`[outscraper-yelp] Review fetch timed out after 120s`);
      return [];
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[outscraper-yelp] Reviews API error:', response.status, errorText);
    throw new Error(`Outscraper Yelp reviews error: ${response.status} - ${errorText}`);
  }

  const result: OutscraperYelpReviewsResponse = await response.json();
  const elapsedMs = Date.now() - t0;

  // Response is nested: data[0] is array of reviews for query 0
  if (!result.data || result.data.length === 0 || !result.data[0]) {
    console.log(`[outscraper-yelp] No reviews returned (${elapsedMs}ms)`);
    return [];
  }

  const reviews = result.data[0];
  const msPerReview = reviews.length > 0 ? Math.round(elapsedMs / reviews.length) : 0;
  console.log(`[outscraper-yelp] Fetched ${reviews.length} reviews in ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s, ${msPerReview}ms/review)`);

  return reviews;
}

// ── Mapper ──

/**
 * Map an Outscraper Yelp review to a yelp_reviews table row.
 */
export function mapYelpReviewToRow(
  review: OutscraperYelpReview,
  locationId: string,
  orgId: string
): {
  location_id: string;
  org_id: string;
  yelp_review_id: string;
  author_name: string | null;
  rating: number;
  review_text: string | null;
  review_photos: string[];
  review_tags: string[];
  owner_replies: string[];
  publish_time: string | null;
} {
  // Parse publish_time from timestamp (preferred) or datetime_utc
  let publishTime: string | null = null;
  if (review.timestamp) {
    publishTime = new Date(review.timestamp * 1000).toISOString();
  } else if (review.datetime_utc) {
    // Format: "05/31/2025 02:17:29"
    const parsed = new Date(review.datetime_utc + ' UTC');
    if (!isNaN(parsed.getTime())) publishTime = parsed.toISOString();
  }

  // Normalize owner_replies — can be array or single owner_reply string
  const ownerReplies = review.owner_replies && review.owner_replies.length > 0
    ? review.owner_replies
    : review.owner_reply ? [review.owner_reply] : [];

  return {
    location_id: locationId,
    org_id: orgId,
    yelp_review_id: review.review_id,
    author_name: review.author_title || null,
    rating: review.review_rating,
    review_text: review.review_text || null,
    review_photos: review.review_photos || [],
    review_tags: Array.isArray(review.review_tags) ? review.review_tags : [],
    owner_replies: ownerReplies,
    publish_time: publishTime,
  };
}
