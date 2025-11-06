/**
 * Script to find Buda and West Buda location IDs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findLocationIds() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 Searching for location IDs...\n');
  
  // Fetch all locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.error('❌ Error fetching locations:', error);
    process.exit(1);
  }
  
  if (!locations || locations.length === 0) {
    console.log('⚠️  No locations found in database');
    process.exit(0);
  }
  
  console.log('📍 Available locations:\n');
  
  locations.forEach(loc => {
    console.log(`   ${loc.name}`);
    console.log(`   ID: ${loc.id}`);
    console.log('');
  });
  
  // Try to find Buda locations
  const budaLoc = locations.find(l => l.name.toLowerCase().includes('buda') && !l.name.toLowerCase().includes('west'));
  const westBudaLoc = locations.find(l => l.name.toLowerCase().includes('west') && l.name.toLowerCase().includes('buda'));
  
  if (budaLoc || westBudaLoc) {
    console.log('🎯 Suggested .env.local values:\n');
    if (budaLoc) {
      console.log(`NEXT_PUBLIC_BUDA_LOCATION_ID=${budaLoc.id}`);
    }
    if (westBudaLoc) {
      console.log(`NEXT_PUBLIC_WEST_BUDA_LOCATION_ID=${westBudaLoc.id}`);
    }
    console.log('');
  }
}

findLocationIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
