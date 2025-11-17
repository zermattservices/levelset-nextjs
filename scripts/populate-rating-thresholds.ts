import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function populateRatingThresholds() {
  console.log('🚀 Populating rating thresholds for all locations...\n');
  console.log('='.repeat(60) + '\n');

  // Get all locations
  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('id, name');

  if (locationsError) {
    console.error('❌ Error fetching locations:', locationsError);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log('ℹ️  No locations found in database');
    process.exit(0);
  }

  console.log(`📊 Found ${locations.length} location(s)\n`);

  // Get existing thresholds
  const { data: existingThresholds, error: thresholdsError } = await supabase
    .from('rating_thresholds')
    .select('location_id');

  if (thresholdsError) {
    console.error('❌ Error fetching existing thresholds:', thresholdsError);
    process.exit(1);
  }

  const existingLocationIds = new Set(
    (existingThresholds || []).map((t) => t.location_id)
  );

  // Find locations without thresholds
  const locationsToInsert = locations.filter(
    (loc) => !existingLocationIds.has(loc.id)
  );

  if (locationsToInsert.length === 0) {
    console.log('✅ All locations already have rating thresholds\n');
    process.exit(0);
  }

  console.log(`📝 Inserting default thresholds for ${locationsToInsert.length} location(s)...\n`);

  // Insert default thresholds
  const inserts = locationsToInsert.map((loc) => ({
    location_id: loc.id,
    yellow_threshold: 1.75,
    green_threshold: 2.75,
  }));

  const { data, error } = await supabase
    .from('rating_thresholds')
    .insert(inserts)
    .select('location_id, yellow_threshold, green_threshold');

  if (error) {
    console.error('❌ Error inserting thresholds:', error);
    process.exit(1);
  }

  console.log('✅ Successfully inserted thresholds:\n');
  data?.forEach((threshold) => {
    const location = locations.find((l) => l.id === threshold.location_id);
    console.log(
      `  ✅ ${location?.name || threshold.location_id}: Yellow=${threshold.yellow_threshold}, Green=${threshold.green_threshold}`
    );
  });

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Populated ${data?.length || 0} threshold row(s)\n`);
}

populateRatingThresholds().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

