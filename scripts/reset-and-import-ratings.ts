import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  uniqueId: string;
  tmName: string;
  leaderName: string;
  timestamp: string;
  position: string;
  criteria1: string;
  criteria2: string;
  criteria3: string;
  criteria4: string;
  criteria5: string;
  rating: string;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
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
    
    if (values.length >= 11) {
      rows.push({
        uniqueId: values[0],
        tmName: values[1],
        leaderName: values[2],
        timestamp: values[3],
        position: values[4],
        criteria1: values[5],
        criteria2: values[6],
        criteria3: values[7],
        criteria4: values[8],
        criteria5: values[9],
        rating: values[10],
      });
    }
  }
  
  return rows;
}

function extractNumericRating(criteriaText: string): number | null {
  const match = criteriaText.match(/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

function parseTimestamp(timestamp: string): string {
  // Parse format like "9/1/25 12:53" to ISO format
  const [datePart, timePart] = timestamp.split(' ');
  const [month, day, year] = datePart.split('/');
  const fullYear = `20${year}`;
  const [hours, minutes] = timePart.split(':');
  
  // Create ISO string
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
}

async function main() {
  console.log('=== RESET AND IMPORT RATINGS ===\n');
  
  // Step 1: Delete all existing ratings
  console.log('Step 1: Deleting all existing ratings...');
  
  const { error: deleteError, count } = await supabase
    .from('ratings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error deleting ratings:', deleteError);
    process.exit(1);
  }
  
  console.log(`✅ Deleted all existing ratings\n`);
  
  // Step 2: Parse CSV file
  console.log('Step 2: Parsing CSV file...');
  const csvPath = path.join(process.cwd(), 'updated_ratings.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  console.log(`✅ Parsed ${rows.length} rows from CSV\n`);
  
  // Step 3: Fetch all employees to create name-to-ID mapping
  console.log('Step 3: Loading employee mappings...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, org_id, location_id');
  
  if (empError || !employees) {
    console.error('Error fetching employees:', empError);
    process.exit(1);
  }
  
  const nameToEmployeeMap = new Map<string, any>();
  employees.forEach(emp => {
    if (emp.full_name) {
      nameToEmployeeMap.set(emp.full_name, emp);
    }
  });
  
  console.log(`✅ Loaded ${nameToEmployeeMap.size} employee mappings\n`);
  
  // Step 4: Process each CSV row
  console.log('Step 4: Processing CSV rows...');
  const newRatings: any[] = [];
  const errors: string[] = [];
  
  for (const row of rows) {
    const employee = nameToEmployeeMap.get(row.tmName);
    const rater = nameToEmployeeMap.get(row.leaderName);
    
    if (!employee) {
      errors.push(`Employee not found: ${row.tmName}`);
      continue;
    }
    
    if (!rater) {
      errors.push(`Rater not found: ${row.leaderName}`);
      continue;
    }
    
    const rating1 = extractNumericRating(row.criteria1);
    const rating2 = extractNumericRating(row.criteria2);
    const rating3 = extractNumericRating(row.criteria3);
    const rating4 = extractNumericRating(row.criteria4);
    const rating5 = extractNumericRating(row.criteria5);
    
    const createdAt = parseTimestamp(row.timestamp);
    
    newRatings.push({
      employee_id: employee.id,
      rater_user_id: rater.id,
      position: row.position,
      rating_1: rating1,
      rating_2: rating2,
      rating_3: rating3,
      rating_4: rating4,
      rating_5: rating5,
      created_at: createdAt,
      org_id: employee.org_id,
      location_id: employee.location_id,
    });
  }
  
  console.log(`\n=== PROCESSING SUMMARY ===`);
  console.log(`Total CSV rows: ${rows.length}`);
  console.log(`Valid ratings to import: ${newRatings.length}`);
  console.log(`Errors (employees not found): ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nEmployees not found:');
    const uniqueErrors = [...new Set(errors)];
    uniqueErrors.forEach(e => console.log(`  - ${e}`));
  }
  
  if (newRatings.length === 0) {
    console.log('\nNo ratings to import.');
    return;
  }
  
  console.log(`\nReady to import ${newRatings.length} ratings.`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 5: Insert in batches of 100
  console.log('\nStep 5: Inserting ratings...');
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < newRatings.length; i += batchSize) {
    const batch = newRatings.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('ratings')
      .insert(batch);
    
    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      break;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1} (${inserted}/${newRatings.length})`);
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`Total ratings inserted: ${inserted}`);
}

main().catch(console.error);

