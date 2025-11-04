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

function cleanPositionName(positionName: string): string {
  // Remove Spanish text (e.g., "Drinks 1/3 | Bebidas 1/3" -> "Drinks 1/3")
  return positionName.split('|')[0].trim();
}

async function main() {
  console.log('Starting ratings import...');
  
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'updated_ratings.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  console.log(`Parsed ${rows.length} rows from CSV`);
  
  // Fetch all employees to create name-to-ID mapping
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name');
  
  if (empError || !employees) {
    console.error('Error fetching employees:', empError);
    process.exit(1);
  }
  
  const nameToIdMap = new Map<string, string>();
  employees.forEach(emp => {
    if (emp.full_name) {
      nameToIdMap.set(emp.full_name, emp.id);
    }
  });
  
  console.log(`Loaded ${nameToIdMap.size} employee name mappings`);
  
  // Fetch existing ratings to avoid duplicates
  const { data: existingRatings, error: ratingsError } = await supabase
    .from('ratings')
    .select('employee_id, rater_user_id, position, created_at');
  
  if (ratingsError || !existingRatings) {
    console.error('Error fetching existing ratings:', ratingsError);
    process.exit(1);
  }
  
  console.log(`Found ${existingRatings.length} existing ratings in database`);
  
  // Create a Set of existing rating keys for quick lookup (using minute precision)
  const existingKeys = new Set<string>();
  existingRatings.forEach(r => {
    // Normalize timestamp to minute precision
    const timestamp = new Date(r.created_at);
    const normalizedTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
      timestamp.getMinutes()
    ).toISOString();
    
    const key = `${r.employee_id}|${r.rater_user_id}|${r.position}|${normalizedTime}`;
    existingKeys.add(key);
  });
  
  // Process each CSV row
  const newRatings: any[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  
  for (const row of rows) {
    const employeeId = nameToIdMap.get(row.tmName);
    const raterId = nameToIdMap.get(row.leaderName);
    
    if (!employeeId) {
      errors.push(`Employee not found: ${row.tmName}`);
      continue;
    }
    
    if (!raterId) {
      errors.push(`Rater not found: ${row.leaderName}`);
      continue;
    }
    
    const rating1 = extractNumericRating(row.criteria1);
    const rating2 = extractNumericRating(row.criteria2);
    const rating3 = extractNumericRating(row.criteria3);
    const rating4 = extractNumericRating(row.criteria4);
    const rating5 = extractNumericRating(row.criteria5);
    const ratingAvg = parseFloat(row.rating);
    
    const createdAt = parseTimestamp(row.timestamp);
    
    // Normalize to minute precision for duplicate check
    const normalizedTime = new Date(createdAt);
    const normalizedKey = new Date(
      normalizedTime.getFullYear(),
      normalizedTime.getMonth(),
      normalizedTime.getDate(),
      normalizedTime.getHours(),
      normalizedTime.getMinutes()
    ).toISOString();
    
    // Clean the position name to remove Spanish text
    const cleanedPosition = cleanPositionName(row.position);
    
    // Check if this rating already exists
    const key = `${employeeId}|${raterId}|${cleanedPosition}|${normalizedKey}`;
    if (existingKeys.has(key)) {
      skipped.push(`Already exists: ${row.tmName} rated by ${row.leaderName} on ${row.timestamp}`);
      continue;
    }
    
    // Get org_id and location_id from the employee
    const employee = employees.find(e => e.id === employeeId);
    
    // Fetch full employee data for org_id and location_id
    const { data: employeeData, error: empDataError } = await supabase
      .from('employees')
      .select('org_id, location_id')
      .eq('id', employeeId)
      .single();
    
    if (empDataError || !employeeData) {
      errors.push(`Could not fetch org/location for employee: ${row.tmName}`);
      continue;
    }
    
    newRatings.push({
      employee_id: employeeId,
      rater_user_id: raterId,
      position: cleanedPosition,
      rating_1: rating1,
      rating_2: rating2,
      rating_3: rating3,
      rating_4: rating4,
      rating_5: rating5,
      // rating_avg is a generated column - don't insert it
      created_at: createdAt,
      org_id: employeeData.org_id,
      location_id: employeeData.location_id,
    });
  }
  
  console.log(`\n=== IMPORT SUMMARY ===`);
  console.log(`Total CSV rows: ${rows.length}`);
  console.log(`New ratings to import: ${newRatings.length}`);
  console.log(`Skipped (already exist): ${skipped.length}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
  
  if (newRatings.length === 0) {
    console.log('\nNo new ratings to import.');
    return;
  }
  
  console.log(`\nReady to import ${newRatings.length} new ratings.`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < newRatings.length; i += batchSize) {
    const batch = newRatings.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('ratings')
      .insert(batch);
    
    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1} (${inserted}/${newRatings.length})`);
    }
  }
  
  console.log(`\n✅ Import complete! Inserted ${inserted} new ratings.`);
}

main().catch(console.error);

