/**
 * Backfill forecast interval data from the HAR file.
 *
 * Extracts 15-minute interval data from the lp-store-volume-data response
 * in the HAR file and inserts it into sales_forecast_intervals.
 *
 * Usage: npx tsx scripts/backfill-forecast-intervals-from-har.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LOCATION_ID = '54cae62b-94d4-49a0-8d39-458ca8b6bc2f';

interface HarEntry {
  request: { url: string };
  response: { content: { text?: string } };
}

interface IntervalRecord {
  forecastId: number;
  clientId: number;
  dateTime: string;
  storeVolume: number;
  volumeTypeId: number;
}

async function main() {
  // Read HAR file
  const harPath = 'apps/dashboard/public/hotschedules.har';
  console.log('Reading HAR file...');
  const har = JSON.parse(fs.readFileSync(harPath, 'utf-8'));

  // Find lp-store-volume-data response with body
  let intervals: IntervalRecord[] = [];
  for (const entry of har.log.entries as HarEntry[]) {
    if (entry.request.url.includes('lp-store-volume-data') && entry.response.content.text) {
      intervals = JSON.parse(entry.response.content.text);
      break;
    }
  }

  if (intervals.length === 0) {
    console.log('No interval data found in HAR');
    return;
  }

  console.log(`Found ${intervals.length} interval records`);

  // Filter to sales only (volumeTypeId === 0) for the current week
  const salesIntervals = intervals.filter(i => i.volumeTypeId === 0);
  console.log(`Sales intervals: ${salesIntervals.length}`);

  // Group by date
  const byDate = new Map<string, IntervalRecord[]>();
  for (const iv of salesIntervals) {
    const date = iv.dateTime.split('T')[0];
    const arr = byDate.get(date) || [];
    arr.push(iv);
    byDate.set(date, arr);
  }

  console.log(`Dates: ${Array.from(byDate.keys()).sort().join(', ')}`);

  // Get existing forecasts for this location
  const { data: forecasts } = await supabase
    .from('sales_forecasts')
    .select('id, forecast_date')
    .eq('location_id', LOCATION_ID);

  if (!forecasts || forecasts.length === 0) {
    console.log('No forecasts found for location');
    return;
  }

  const forecastByDate = new Map<string, string>();
  for (const f of forecasts) {
    forecastByDate.set(f.forecast_date, f.id);
  }

  console.log(`Existing forecast dates: ${forecasts.map(f => f.forecast_date).join(', ')}`);

  let totalInserted = 0;

  for (const [date, dateIntervals] of Array.from(byDate.entries())) {
    const forecastId = forecastByDate.get(date);
    if (!forecastId) {
      console.log(`  No forecast record for ${date}, skipping`);
      continue;
    }

    // Build interval rows
    const intervalRows = dateIntervals.map(iv => {
      const timePart = iv.dateTime.split('T')[1]?.substring(0, 5) || '00:00';
      return {
        interval_start: timePart,
        sales_amount: iv.storeVolume,
        transaction_count: null as number | null,
      };
    });

    // Use the RPC function to atomically replace intervals
    const { data: count, error } = await supabase.rpc('sync_forecast_intervals', {
      p_forecast_id: forecastId,
      p_intervals: intervalRows,
    });

    if (error) {
      console.error(`  Error syncing intervals for ${date}:`, error);
    } else {
      const inserted = (count as number) || intervalRows.length;
      console.log(`  ${date}: ${inserted} intervals synced`);
      totalInserted += inserted;
    }
  }

  console.log(`\nTotal intervals inserted: ${totalInserted}`);
}

main().catch(console.error);
