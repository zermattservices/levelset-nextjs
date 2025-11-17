import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const TARGET_LOCATION_NAME = 'Buda FSU';
const START = '2025-11-04T00:00:00Z';
const END = '2025-11-16T00:00:00Z';

function normalizeTimestamp(iso: string): string {
  const date = new Date(iso);
  date.setSeconds(0, 0);
  return date.toISOString();
}

async function main() {
  console.log('Resolving location...');
  const { data: loc, error: locError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', TARGET_LOCATION_NAME)
    .maybeSingle();

  if (locError || !loc) {
    console.error('Failed to resolve location', locError);
    process.exit(1);
  }

  console.log('Fetching ratings for window...');
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select('id, employee_id, rater_user_id, position, created_at')
    .eq('location_id', loc.id)
    .gte('created_at', START)
    .lte('created_at', END)
    .order('created_at', { ascending: true })
    .limit(2000);

  if (error || !ratings) {
    console.error('Failed to fetch ratings', error);
    process.exit(1);
  }

  console.log(`Fetched ${ratings.length} ratings in window`);

  const duplicates: string[] = [];
  const groups = new Map<string, string[]>();

  for (const rating of ratings) {
    const key = `${rating.employee_id}|${rating.rater_user_id}|${rating.position}|${normalizeTimestamp(rating.created_at)}`;
    if (!groups.has(key)) {
      groups.set(key, [rating.id]);
    } else {
      groups.get(key)!.push(rating.id);
    }
  }

  groups.forEach((ids) => {
    if (ids.length > 1) {
      // keep first entry, delete the rest
      duplicates.push(...ids.slice(1));
    }
  });

  console.log(`Identified ${duplicates.length} duplicate rows to delete.`);

  if (duplicates.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  const batchSize = 200;
  for (let i = 0; i < duplicates.length; i += batchSize) {
    const batch = duplicates.slice(i, i + batchSize);
    const { error: delError } = await supabase.from('ratings').delete().in('id', batch);
    if (delError) {
      console.error('Failed deleting batch', delError);
      process.exit(1);
    }
    console.log(`Deleted batch ${i / batchSize + 1} (${Math.min(i + batch.length, duplicates.length)}/${duplicates.length})`);
  }

  console.log('Duplicate cleanup complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
