import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching all ratings...');
  
  const { data: allRatings, error } = await supabase
    .from('ratings')
    .select('id, employee_id, rater_user_id, position, created_at')
    .order('created_at', { ascending: true });
  
  if (error || !allRatings) {
    console.error('Error fetching ratings:', error);
    process.exit(1);
  }
  
  console.log(`Total ratings in database: ${allRatings.length}`);
  
  // Find duplicates based on employee_id, rater_user_id, position, and created_at (to minute precision)
  const seen = new Map<string, string>();
  const duplicateIds: string[] = [];
  
  for (const rating of allRatings) {
    // Normalize timestamp to minute precision (ignore seconds)
    const timestamp = new Date(rating.created_at);
    const normalizedTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
      timestamp.getMinutes()
    ).toISOString();
    
    const key = `${rating.employee_id}|${rating.rater_user_id}|${rating.position}|${normalizedTime}`;
    
    if (seen.has(key)) {
      // This is a duplicate - keep the first one (oldest ID), delete this one
      duplicateIds.push(rating.id);
    } else {
      seen.set(key, rating.id);
    }
  }
  
  console.log(`\nFound ${duplicateIds.length} duplicate ratings to delete`);
  
  if (duplicateIds.length === 0) {
    console.log('No duplicates found!');
    return;
  }
  
  console.log('\nWaiting 5 seconds before deletion...');
  console.log('Press Ctrl+C to cancel');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Delete in batches
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < duplicateIds.length; i += batchSize) {
    const batch = duplicateIds.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from('ratings')
      .delete()
      .in('id', batch);
    
    if (deleteError) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`Deleted batch ${i / batchSize + 1} (${deleted}/${duplicateIds.length})`);
    }
  }
  
  console.log(`\n✅ Cleanup complete! Deleted ${deleted} duplicate ratings.`);
  console.log(`Remaining ratings: ${allRatings.length - deleted}`);
}

main().catch(console.error);

