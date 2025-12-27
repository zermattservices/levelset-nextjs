/**
 * Import CFA Location List CSV into Supabase
 * Run with: npx tsx scripts/import-cfa-locations.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CFALocation {
  location_name: string;
  location_num: string;
  operator: string;
  type: string;
  state: string;
  open_date: string;
}

function parseCSV(csvContent: string): CFALocation[] {
  const lines = csvContent.split('\n');
  const locations: CFALocation[] = [];
  
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
    
    if (values.length >= 6) {
      locations.push({
        location_name: values[0] || '',
        location_num: values[1] || '',
        operator: values[2] || '',
        type: values[3] || '',
        state: values[4] || '',
        open_date: values[5] || '',
      });
    }
  }
  
  return locations;
}

async function importLocations() {
  console.log('📂 Reading CSV file...');
  
  const csvPath = path.join(__dirname, '..', 'CFA_Location_List_111125.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  console.log('🔄 Parsing CSV...');
  const locations = parseCSV(csvContent);
  console.log(`   Found ${locations.length} locations`);
  
  // Insert in batches of 500
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('cfa_locations')
      .upsert(batch, { onConflict: 'location_num' });
    
    if (error) {
      console.error(`   ❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${locations.length})`);
    }
  }
  
  console.log(`\n✨ Import complete!`);
  console.log(`   Total locations: ${locations.length}`);
  console.log(`   Successfully inserted: ${inserted}`);
  console.log(`   Errors: ${errors}`);
}

importLocations().catch(console.error);


