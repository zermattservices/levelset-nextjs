/**
 * Import CFA Location Directory
 *
 * Imports CFA locations from CSV into the cfa_location_directory table
 * for fast store number lookup during onboarding.
 *
 * Usage: npx tsx scripts/import-cfa-locations.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CfaDirectoryRow {
  location_name: string;
  location_number: string;
  operator_name: string | null;
  location_type: string | null;
  state: string | null;
  open_date: string | null;
}

function parseCSV(csvContent: string): CfaDirectoryRow[] {
  const lines = csvContent.split('\n');
  const locations: CfaDirectoryRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle commas in quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const locationName = values[0]?.trim();
    const locationNumber = values[1]?.trim();

    if (!locationName || !locationNumber) continue;

    locations.push({
      location_name: locationName,
      location_number: locationNumber,
      operator_name: values[2]?.trim() || null,
      location_type: values[3]?.trim() || null,
      state: values[4]?.trim() || null,
      open_date: values[5]?.trim() || null,
    });
  }

  return locations;
}

async function importLocations() {
  console.log('Reading CSV file...');

  const csvPath = path.join(__dirname, '..', 'CFA_Location_List_111125.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('Parsing CSV...');
  const locations = parseCSV(csvContent);
  console.log(`Found ${locations.length} locations`);

  // Insert in batches of 500
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);

    const { error } = await supabase
      .from('cfa_location_directory')
      .upsert(batch, { onConflict: 'location_number' });

    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${locations.length})`);
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Total locations: ${locations.length}`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);

  // Verify count
  const { count } = await supabase
    .from('cfa_location_directory')
    .select('*', { count: 'exact', head: true });

  console.log(`Records in cfa_location_directory: ${count}`);
}

importLocations().catch(console.error);
