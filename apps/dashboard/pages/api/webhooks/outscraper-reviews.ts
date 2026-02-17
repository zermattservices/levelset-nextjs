import { createServerSupabaseClient } from '@/lib/supabase-server';
import { mapOutscraperReviewToRow } from '@/lib/outscraper';
import type { OutscraperPlaceResult } from '@/lib/outscraper';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/webhooks/outscraper-reviews
 *
 * Webhook endpoint that Outscraper calls when an async review scrape completes.
 * Outscraper POSTs the full result payload here. We parse out the reviews and
 * upsert them into the google_reviews table for realtime ingestion.
 *
 * Query params (passed via the webhook URL when submitting the async request):
 *   - locationId: The Levelset location UUID
 *   - orgId: The organization UUID
 *   - secret: A shared secret to verify the webhook is legitimate
 *
 * Body: Outscraper response JSON (same format as synchronous response)
 */

// Disable Next.js body size limit — Outscraper payloads can be large for places with many reviews
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract context from query params (set when we built the webhook URL)
  const locationId = req.query.locationId as string;
  const orgId = req.query.orgId as string;
  const secret = req.query.secret as string;

  // Verify the webhook secret matches our CRON_SECRET
  const expectedSecret = process.env.CRON_SECRET || process.env.OUTSCRAPER_API_KEY;
  if (!secret || secret !== expectedSecret) {
    console.error('[outscraper-webhook] Invalid or missing secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!locationId || !orgId) {
    console.error('[outscraper-webhook] Missing locationId or orgId in query params');
    return res.status(400).json({ error: 'locationId and orgId are required as query params' });
  }

  try {
    const body = req.body;

    // Outscraper webhook payload structure:
    // The body is the same as the synchronous response — { id, status, data: [...] }
    // OR it could be just the data array directly depending on the format.
    let placeResults: OutscraperPlaceResult[] = [];

    if (body?.data && Array.isArray(body.data)) {
      // Standard response format: { id, status, data: [PlaceResult, ...] }
      placeResults = body.data;
    } else if (Array.isArray(body)) {
      // Sometimes webhook sends just the data array
      placeResults = body;
    } else {
      console.warn('[outscraper-webhook] Unexpected payload format:', JSON.stringify(body).slice(0, 200));
      return res.status(200).json({ success: true, message: 'No reviews data found in payload' });
    }

    if (placeResults.length === 0 || !placeResults[0]?.reviews_data) {
      console.log('[outscraper-webhook] No reviews in webhook payload');
      return res.status(200).json({ success: true, newReviews: 0, updatedReviews: 0 });
    }

    const place = placeResults[0];
    const reviews = place.reviews_data;

    console.log(`[outscraper-webhook] Received ${reviews.length} reviews for location ${locationId}`);

    const supabase = createServerSupabaseClient();

    // Map reviews to DB rows
    const rows = reviews.map((r) => mapOutscraperReviewToRow(r, locationId, orgId));

    // Batch upsert
    let newReviews = 0;
    let updatedReviews = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
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
        console.error('[outscraper-webhook] Batch upsert error:', batchError);
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

    // Update the location's google_review_count with the actual DB count now
    const { count } = await supabase
      .from('google_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId);

    if (count !== null) {
      await supabase
        .from('locations')
        .update({
          google_review_count: count,
          google_last_synced_at: new Date().toISOString(),
        })
        .eq('id', locationId);
    }

    console.log(`[outscraper-webhook] Done: ${newReviews} new, ${updatedReviews} updated reviews for location ${locationId}`);

    return res.status(200).json({
      success: true,
      newReviews,
      updatedReviews,
      totalInDb: count,
    });
  } catch (error: any) {
    console.error('[outscraper-webhook] Error processing webhook:', error);
    return res.status(500).json({ error: error.message || 'Failed to process webhook' });
  }
}
