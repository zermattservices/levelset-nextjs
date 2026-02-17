import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncLocationFromGoogle } from '@/lib/google-places';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/cron/sync-google-reviews
 *
 * Weekly cron job (Sunday 6 AM UTC) to sync Google reviews and business hours
 * for all locations with a connected Google Maps Place.
 *
 * Authenticated via Bearer CRON_SECRET header.
 * Only runs in production environment.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only run in production to avoid duplicate syncs
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv !== 'production') {
    console.log(`[Cron] Skipping Google review sync - not in production (current: ${vercelEnv})`);
    return res.status(200).json({
      success: false,
      message: `Skipped - running in ${vercelEnv} environment.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized Google review sync attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Starting weekly Google review sync...');
    const supabase = createServerSupabaseClient();

    // Find all locations with a Google Place connected
    const { data: locations, error: queryError } = await supabase
      .from('locations')
      .select('id, org_id, google_place_id')
      .not('google_place_id', 'is', null);

    if (queryError) {
      throw new Error(`Failed to query locations: ${queryError.message}`);
    }

    if (!locations || locations.length === 0) {
      console.log('[Cron] No locations connected to Google Maps');
      return res.status(200).json({
        success: true,
        message: 'No locations connected to Google Maps',
        synced: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Cron] Syncing ${locations.length} location(s)...`);

    const results: Array<{
      locationId: string;
      success: boolean;
      newReviews?: number;
      updatedReviews?: number;
      error?: string;
    }> = [];

    for (const location of locations) {
      try {
        const result = await syncLocationFromGoogle(
          supabase,
          location.id,
          location.google_place_id!,
          location.org_id
        );

        results.push({
          locationId: location.id,
          success: true,
          newReviews: result.newReviews,
          updatedReviews: result.updatedReviews,
        });

        console.log(
          `[Cron] Synced location ${location.id}: ${result.newReviews} new, ${result.updatedReviews} updated reviews`
        );
      } catch (err: any) {
        console.error(`[Cron] Error syncing location ${location.id}:`, err);
        results.push({
          locationId: location.id,
          success: false,
          error: err.message,
        });
      }
    }

    const totalNew = results.reduce((sum, r) => sum + (r.newReviews || 0), 0);
    const totalUpdated = results.reduce((sum, r) => sum + (r.updatedReviews || 0), 0);
    const errors = results.filter((r) => !r.success);

    console.log(
      `[Cron] Google review sync complete: ${locations.length} locations, ${totalNew} new reviews, ${totalUpdated} updated, ${errors.length} errors`
    );

    return res.status(200).json({
      success: true,
      message: `Synced ${locations.length} location(s)`,
      synced: locations.length,
      totalNewReviews: totalNew,
      totalUpdatedReviews: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error running Google review sync:', error);
    return res.status(500).json({
      error: 'Failed to run Google review sync',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
