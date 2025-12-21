/**
 * Script to upload location logos to Supabase storage and update the locations table
 * 
 * Prerequisites:
 * 1. Create the 'location_logos' bucket in Supabase Dashboard (Storage > New bucket)
 * 2. Make the bucket PUBLIC (or configure appropriate RLS policies)
 * 
 * Run with: npx ts-node scripts/upload-location-logos.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping of location IDs to their logo files
const locationLogoMapping: { [locationId: string]: string } = {
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd': 'CFA Buda Logo.png',      // Buda FSU
  'e437119c-27d9-4114-9273-350925016738': 'CFA West Buda Logo.png', // West Buda FSU
  '0d462b41-b957-419b-9d83-978e5c6e2279': 'Circle C CFA.png',       // Lake Travis FSU
};

const BUCKET_NAME = 'location_logos';
const LOGOS_DIR = path.join(__dirname, '../public/logos');

async function uploadLogos() {
  console.log('Starting logo upload...\n');

  for (const [locationId, logoFile] of Object.entries(locationLogoMapping)) {
    const filePath = path.join(LOGOS_DIR, logoFile);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `${locationId}/${logoFile}`;

    console.log(`Uploading ${logoFile} for location ${locationId}...`);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error(`  Error uploading: ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`  Uploaded to: ${publicUrl}`);

    // Update location record
    const { error: updateError } = await supabase
      .from('locations')
      .update({ image_url: publicUrl })
      .eq('id', locationId);

    if (updateError) {
      console.error(`  Error updating location: ${updateError.message}`);
    } else {
      console.log(`  Updated location image_url`);
    }
  }

  console.log('\nDone!');
}

uploadLogos().catch(console.error);
