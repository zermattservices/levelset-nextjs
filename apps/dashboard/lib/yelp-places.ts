import { SupabaseClient } from '@supabase/supabase-js';
import {
  searchYelpBusiness,
  fetchYelpBusinessInfo,
  fetchYelpReviews,
  mapYelpReviewToRow,
} from './outscraper-yelp';

/**
 * Phase 1b: Find the matching Yelp business and save the connection.
 * Called automatically during Google connect with the business name
 * and formatted address from the Google Places response.
 *
 * Fast (~1-3s). Returns { found: false } if no match.
 */
export async function findAndConnectYelpBusiness(
  supabase: SupabaseClient,
  locationId: string,
  businessName: string,
  formattedAddress: string,
  orgId: string
): Promise<{
  found: boolean;
  bizId: string | null;
  rating: number | null;
  reviewCount: number | null;
}> {
  const match = await searchYelpBusiness(businessName, formattedAddress);

  if (!match) {
    return { found: false, bizId: null, rating: null, reviewCount: null };
  }

  // Write Yelp info to the locations row
  const { error: updateError } = await supabase
    .from('locations')
    .update({
      yelp_biz_id: match.biz_id,
      yelp_business_url: match.business_url,
      yelp_rating: match.rating || null,
      yelp_review_count: match.reviews || null,
      yelp_last_synced_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  if (updateError) {
    console.error('[yelp-places] Error updating location with Yelp info:', updateError);
    throw new Error(`Failed to save Yelp connection: ${updateError.message}`);
  }

  console.log(`[yelp-places] Connected Yelp: "${match.name}" (biz_id=${match.biz_id}, ${match.reviews} reviews)`);

  return {
    found: true,
    bizId: match.biz_id,
    rating: match.rating || null,
    reviewCount: match.reviews || null,
  };
}

/**
 * Phase 2: Sync reviews from Yelp via Outscraper.
 *
 * Credit optimization (same strategy as Google):
 *   1. Compare known yelp_review_count against DB count.
 *   2. If counts match → skip (0 credits).
 *   3. If delta exists → fetch delta + buffer.
 *   4. First fetch → unlimited.
 */
export async function syncReviewsFromYelp(
  supabase: SupabaseClient,
  locationId: string,
  yelpBizId: string,
  orgId: string
): Promise<{
  newReviews: number;
  updatedReviews: number;
}> {
  // Get the stored Yelp info from the locations row
  const { data: loc } = await supabase
    .from('locations')
    .select('yelp_review_count, yelp_business_url')
    .eq('id', locationId)
    .single();

  let knownCount = loc?.yelp_review_count || 0;

  // Refresh the review count from Yelp (same as Google re-fetching userRatingCount)
  // so the credit optimization delta check uses the current count, not a stale one.
  if (loc?.yelp_business_url) {
    try {
      const freshInfo = await fetchYelpBusinessInfo(loc.yelp_business_url);
      if (freshInfo && freshInfo.reviewCount > 0) {
        console.log(`[yelp-places] Refreshed Yelp count: ${knownCount} → ${freshInfo.reviewCount}`);
        knownCount = freshInfo.reviewCount;
        // Update the location row with the fresh count + rating
        await supabase
          .from('locations')
          .update({
            yelp_review_count: freshInfo.reviewCount,
            yelp_rating: freshInfo.rating || undefined,
          })
          .eq('id', locationId);
      }
    } catch (err: any) {
      console.error('[yelp-places] Failed to refresh Yelp count (non-fatal):', err.message);
    }
  }

  // Count existing reviews in DB
  const { count: dbCount } = await supabase
    .from('yelp_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId);

  const existingCount = dbCount || 0;
  const delta = knownCount - existingCount;

  console.log(`[yelp-places] Review count — Yelp: ${knownCount}, DB: ${existingCount}, delta: ${delta}`);

  let newReviews = 0;
  let updatedReviews = 0;

  // Outscraper caps Yelp reviews at 100 per request. If we already have 100+,
  // we've hit the cap and re-fetching won't yield new reviews.
  const OUTSCRAPER_YELP_CAP = 100;

  // If we have all reviews already (or hit the Outscraper cap), skip
  if (existingCount > 0 && (delta <= 0 || existingCount >= OUTSCRAPER_YELP_CAP)) {
    console.log(`[yelp-places] No new Yelp reviews to fetch — skipping (DB: ${existingCount}, Yelp: ${knownCount}, cap: ${OUTSCRAPER_YELP_CAP})`);
    return { newReviews: 0, updatedReviews: 0 };
  }

  const isFirstFetch = existingCount === 0;
  const limit = isFirstFetch ? 0 : Math.max(delta + 5, 10);

  // Get cutoff from latest existing review
  let cutoff: number | undefined;
  if (!isFirstFetch) {
    const { data: latestReview } = await supabase
      .from('yelp_reviews')
      .select('publish_time, created_at')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestReview?.publish_time) {
      cutoff = Math.floor(new Date(latestReview.publish_time).getTime() / 1000);
    }
  }

  console.log(`[yelp-places] Fetching reviews (${isFirstFetch ? 'full' : 'incremental'}, limit=${limit})`);

  const reviews = await fetchYelpReviews(yelpBizId, {
    limit,
    sort: 'date_desc',
    cutoff,
  });

  if (reviews.length === 0) {
    console.log('[yelp-places] No reviews returned from Outscraper');
    return { newReviews: 0, updatedReviews: 0 };
  }

  // Map and batch upsert
  const rows = reviews.map((r) => mapYelpReviewToRow(r, locationId, orgId));

  const dbT0 = Date.now();
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      ...row,
      last_synced_at: new Date().toISOString(),
    }));

    const { data: upsertedData, error: batchError } = await supabase
      .from('yelp_reviews')
      .upsert(batch, {
        onConflict: 'location_id,yelp_review_id',
        ignoreDuplicates: false,
      })
      .select('first_synced_at, last_synced_at');

    if (batchError) {
      console.error('[yelp-places] Batch upsert error:', batchError);
      continue;
    }

    if (upsertedData) {
      for (const row of upsertedData) {
        const firstSynced = new Date(row.first_synced_at).getTime();
        const lastSynced = new Date(row.last_synced_at).getTime();
        if (Math.abs(lastSynced - firstSynced) < 2000) newReviews++;
        else updatedReviews++;
      }
    }
  }

  console.log(`[yelp-places] DB upsert completed in ${Date.now() - dbT0}ms — ${newReviews} new, ${updatedReviews} updated reviews`);

  // Update the location's last synced time.
  // Keep yelp_review_count as the Yelp-reported knownCount (refreshed above),
  // not the DB count — mirrors how Google uses userRatingCount.
  await supabase
    .from('locations')
    .update({
      yelp_review_count: knownCount,
      yelp_last_synced_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  return { newReviews, updatedReviews };
}
