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

// Location configuration
const LOCATIONS = [
  {
    locationNumber: '04066',
    locationName: 'Buda FSU',
    csvPath: path.join(process.cwd(), 'public/04066_ratingsUpdate.csv'),
  },
  {
    locationNumber: '05508',
    locationName: 'West Buda FSU',
    csvPath: path.join(process.cwd(), 'public/05508_ratingsUpdate.csv'),
  },
];

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

// Name mapping dictionaries based on the mismatch report
const EMPLOYEE_NAME_MAP: Record<string, string> = {
  // Buda name variations
  'Aurora Landa': 'Aurora Landa Mendez',
  'Joshua Garcia': 'Josh Garcia',
  'Giselle Laredo': 'Giselle Loredo',
  
  // West Buda name variations
  'Cassandra Mata': 'Casandra Mata',
  'Juliette Aguilar': 'Julette Aguilar',
  'Brayan Castro': 'Brayan Castro Moreno',
  'Christopher Cruz Garcia': 'Christopher Garcia',
  'Makenzie Layne': 'Makenzi Layne',
  'Joaquin Ibarra': 'Joseph Ibarra',
  'Colton Stark': 'Colten Stark',
  'Gael Nova': 'Gael Novoa',
  'Liliam Martinez': 'Lilliam Martinez',
  'Monica Alonso': 'Monica Alonso Feliciano',
  'Yosbel Crespo': 'Yosbaldo Crespo Zamora',
  'Claudio Garcia': 'Claudio Garcia camano',
  'Linzy Vazquez': 'Linzy Vazquez rodriguez',
  'Dayana Hernandez': 'Dayana Hernandez villa',
  'Yair Oaxaca Lopez': 'Yair Oaxaca lopez',
  'Marissa Murillo': 'Marisa Murillo',
  'Yesica Lopez': 'Yessica Lopez',
  'Robbie George': 'Robert George',
  
  // West Buda employee mappings (only if they're actually employees at West Buda)
  'Eli Garcia': 'Elizabeth Garcia',
  'Eli V': 'Elizabeth Vazquez',
  'David': 'David Santiago',
  'Greyca': 'Grecia Madueno',
  
  // These are leaders from Buda appearing as employees in West Buda CSV - they don't exist as employees
  // They should be skipped (they're only leaders/raters, not employees at West Buda)
  // Note: These will be caught by the employee lookup and skipped with an error
};

// Employees that should have null employee_id (keep ratings but no employee)
const NULL_EMPLOYEE_IDS = new Set([
  'Myron Barnes',
  'Leobardo Mendez',
  'Jessica Estrada',
  'Kayden Humpherys',
]);

// Rater name mappings (first names to full names)
const RATER_NAME_MAP: Record<string, string> = {
  'Nestor': 'Nestor Reyes',
  'Dom': 'Dominique Miller',
  'Daniel': 'Daniel Van Cleave',
  'Tim': 'Timothy Lane',
  'Kaiya': 'Kaiya Ramos',
  'Luke': 'Luke Kilstrom',
  'Ethan': 'Ethan Coniker',
  'Jessica': 'Jessica Badejo',
  'Carlos': 'Carlos Hermosillo',
  'Monica': 'Monica Coniker',
  'Kianna': 'Kianna Ramos',
  'Mina': 'Mina Tieu',
  'Vanessa': 'Vanessa Hicks',
  'Eli V': 'Elizabeth Vazquez',
  'Amanda': 'Amanda Luna',
  'Eric': 'Eric Reyna',
  'Angeles': 'Angeles Carbajal',
  'Jenny': 'Jenny Reyes Ramos',
  'Magali Rodriguez': 'Magali Rodriguez Barrera',
  'Brayan Castro': 'Brayan Castro Moreno',
  'Eli Garcia': 'Elizabeth Garcia',
  'Jason': 'Jason Luna', // Map Jason to Jason Luna (leader from Buda)
  'Nayeli': 'Nayeli Rodriguez', // Map Nayeli to Nayeli Rodriguez (leader from Buda)
  'Marissa Murillo': 'Marisa Murillo', // Spelling correction
};

// Raters that should have null rater_user_id (keep ratings but no rater)
const NULL_RATER_IDS = new Set([
  'Doris',
  'Bessie',
  'Greyca',
]);

async function main() {
  console.log('=== RATINGS IMPORT FOR BOTH LOCATIONS ===\n');
  
  // Step 1: Resolve locations and get org_id
  const locationMap = new Map<string, { id: string; org_id: string; name: string }>();
  
  for (const loc of LOCATIONS) {
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, org_id, name')
      .eq('name', loc.locationName)
      .maybeSingle();

    if (locationError || !location) {
      console.error(`Unable to resolve location "${loc.locationName}":`, locationError);
      process.exit(1);
    }

    locationMap.set(loc.locationNumber, location);
    console.log(`Resolved ${loc.locationName} (${loc.locationNumber}) -> location_id=${location.id}, org_id=${location.org_id}`);
  }
  
  const orgId = Array.from(locationMap.values())[0].org_id;
  const locationIds = Array.from(locationMap.values()).map(loc => loc.id);
  
  // Step 2: Delete all existing ratings for both locations
  console.log('\nStep 1: Deleting existing ratings...');
  const { data: deletedRatings, error: deleteError } = await supabase
    .from('ratings')
    .delete()
    .in('location_id', locationIds)
    .select();
  
  if (deleteError) {
    console.error('Error deleting existing ratings:', deleteError);
    process.exit(1);
  }
  
  console.log(`✅ Deleted ${deletedRatings?.length || 0} existing ratings\n`);
  
  // Step 2.5: Update Brayan Castro Moreno to Team Lead if needed
  console.log('Step 2: Updating Brayan Castro Moreno to Team Lead...');
  const { error: updateError } = await supabase
    .from('employees')
    .update({ role: 'Team Lead' })
    .eq('full_name', 'Brayan Castro Moreno')
    .eq('location_id', locationMap.get('05508')!.id);
  
  if (updateError) {
    console.warn('Warning: Could not update Brayan Castro Moreno role:', updateError);
  } else {
    console.log('✅ Updated Brayan Castro Moreno to Team Lead\n');
  }
  
  // Step 2.6: Create missing employees for Buda
  console.log('Step 3: Creating missing employees for Buda...');
  const budaLocationId = locationMap.get('04066')!.id;
  const newEmployees = [
    { first_name: 'Elizabeth', last_name: 'Scott', role: 'Team Member', location_id: budaLocationId, org_id: orgId, active: true, is_foh: true, is_boh: false },
    { first_name: 'Monica', last_name: 'Murillo', role: 'Team Member', location_id: budaLocationId, org_id: orgId, active: true, is_foh: true, is_boh: false },
    { first_name: 'Alejandro', last_name: 'Amado', role: 'Team Member', location_id: budaLocationId, org_id: orgId, active: true, is_foh: true, is_boh: false },
  ];
  
  for (const emp of newEmployees) {
    const fullName = `${emp.first_name} ${emp.last_name}`;
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('first_name', emp.first_name)
      .eq('last_name', emp.last_name)
      .eq('location_id', emp.location_id)
      .maybeSingle();
    
    if (!existing) {
      const { data: created, error: createError } = await supabase
        .from('employees')
        .insert(emp)
        .select('id')
        .single();
      
      if (createError) {
        console.warn(`Warning: Could not create ${fullName}:`, createError);
      } else {
        console.log(`✅ Created employee: ${fullName}`);
      }
    }
  }
  console.log('');
  
  // Step 3: Fetch all employees to create name-to-ID mapping (across all locations in org)
  console.log('Step 4: Loading employee name mappings...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, location_id')
    .eq('org_id', orgId);
  
  if (empError || !employees) {
    console.error('Error fetching employees:', empError);
    process.exit(1);
  }
  
  // Create name-to-ID map (employees must be from the location, raters can be from any location in org)
  const employeeNameToIdMap = new Map<string, Map<string, string>>(); // location_id -> name -> id
  const raterNameToIdMap = new Map<string, string>(); // name -> id (across all locations)
  
  employees.forEach(emp => {
    if (emp.full_name) {
      // For employees: map by location
      if (!employeeNameToIdMap.has(emp.location_id)) {
        employeeNameToIdMap.set(emp.location_id, new Map());
      }
      employeeNameToIdMap.get(emp.location_id)!.set(emp.full_name, emp.id);
      
      // For raters: map across all locations (raters can be from any location)
      raterNameToIdMap.set(emp.full_name, emp.id);
    }
  });
  
  console.log(`✅ Loaded employee mappings for ${employees.length} employees\n`);
  
  // Step 4: Process each location's CSV
  let totalImported = 0;
  let totalErrors = 0;
  
  for (const loc of LOCATIONS) {
    console.log(`\n=== Processing ${loc.locationName} (${loc.locationNumber}) ===`);
    
    const location = locationMap.get(loc.locationNumber)!;
    const locationEmployeeMap = employeeNameToIdMap.get(location.id) || new Map();
    
    // Read CSV file
    if (!fs.existsSync(loc.csvPath)) {
      console.error(`❌ CSV file not found: ${loc.csvPath}`);
      continue;
    }
    
    const csvContent = fs.readFileSync(loc.csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows from CSV`);
    
    // Process each CSV row
    const newRatings: any[] = [];
    const errors: string[] = [];
    
    // Track ratings to prevent duplicates
    const ratingKeys = new Set<string>();
    
    for (const row of rows) {
      // Apply employee name mapping
      let employeeName = row.tmName;
      if (EMPLOYEE_NAME_MAP[employeeName]) {
        employeeName = EMPLOYEE_NAME_MAP[employeeName];
      }
      
      // Also check rater name map for employees (some first names might map to leaders)
      if (RATER_NAME_MAP[employeeName]) {
        employeeName = RATER_NAME_MAP[employeeName];
      }
      
      // Check if employee should be skipped (intentional null)
      if (NULL_EMPLOYEE_IDS.has(row.tmName)) {
        // Skip this rating - can't insert without employee_id
        continue;
      }
      
      // Find employee ID (must be from this location)
      let employeeId = locationEmployeeMap.get(employeeName) || null;
      if (!employeeId && row.tmName !== employeeName) {
        // Try original name if mapped name didn't work
        employeeId = locationEmployeeMap.get(row.tmName) || null;
      }
      
      // Skip if employee_id is missing (required field)
      if (!employeeId) {
        errors.push(`Employee not found: ${row.tmName} (mapped to: ${employeeName})`);
        continue;
      }
      
      // Apply rater name mapping
      let raterName = row.leaderName;
      if (RATER_NAME_MAP[raterName]) {
        raterName = RATER_NAME_MAP[raterName];
      }
      
      // Check if rater should be skipped (intentional null)
      if (NULL_RATER_IDS.has(row.leaderName)) {
        // Skip this rating - can't insert without rater_user_id
        continue;
      }
      
      // Find rater ID (can be from any location in org)
      let raterId = raterNameToIdMap.get(raterName) || null;
      if (!raterId && row.leaderName !== raterName) {
        // Try original name if mapped name didn't work
        raterId = raterNameToIdMap.get(row.leaderName) || null;
      }
      
      // Skip if rater_user_id is missing (required field)
      if (!raterId) {
        errors.push(`Rater not found: ${row.leaderName} (mapped to: ${raterName})`);
        continue;
      }
      
      const rating1 = extractNumericRating(row.criteria1);
      const rating2 = extractNumericRating(row.criteria2);
      const rating3 = extractNumericRating(row.criteria3);
      const rating4 = extractNumericRating(row.criteria4);
      const rating5 = extractNumericRating(row.criteria5);
      
      let createdAt: string;
      try {
        createdAt = parseTimestamp(row.timestamp);
      } catch (err) {
        errors.push(`Invalid timestamp for ${row.tmName}: ${row.timestamp}`);
        continue;
      }
      
      // Clean the position name to remove Spanish text
      const cleanedPosition = cleanPositionName(row.position);
      
      // Create a unique key to prevent duplicates
      // Use employee_id or employee name, rater_id or rater name, position, and timestamp (minute precision)
      const normalizedTime = new Date(createdAt);
      normalizedTime.setSeconds(0, 0);
      const normalizedTimeStr = normalizedTime.toISOString();
      const duplicateKey = `${employeeId || employeeName}|${raterId || raterName}|${cleanedPosition}|${normalizedTimeStr}`;
      
      if (ratingKeys.has(duplicateKey)) {
        // Skip duplicate
        continue;
      }
      ratingKeys.add(duplicateKey);
      
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
        org_id: orgId,
        location_id: location.id,
      });
    }
    
    console.log(`\n${loc.locationName} Summary:`);
    console.log(`  Total CSV rows: ${rows.length}`);
    console.log(`  Valid ratings: ${newRatings.length}`);
    console.log(`  Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n  Errors encountered:');
      errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
      if (errors.length > 10) {
        console.log(`    ... and ${errors.length - 10} more`);
      }
      const uniqueErrors = Array.from(new Set(errors));
      fs.writeFileSync(
        path.join(process.cwd(), `missing_names_${loc.locationNumber}.txt`),
        uniqueErrors.join('\n'),
        'utf-8'
      );
      console.log(`\n  Full missing name list saved to missing_names_${loc.locationNumber}.txt (${uniqueErrors.length} entries).`);
    }
    
    if (newRatings.length === 0) {
      console.log(`  ⚠️  No ratings to import for ${loc.locationName}`);
      continue;
    }
    
    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    
    console.log(`\n  Importing ${newRatings.length} ratings...`);
    
    for (let i = 0; i < newRatings.length; i += batchSize) {
      const batch = newRatings.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('ratings')
        .insert(batch);
      
      if (insertError) {
        console.error(`  ❌ Error inserting batch ${i / batchSize + 1}:`, insertError);
        totalErrors += batch.length;
      } else {
        inserted += batch.length;
        if ((i / batchSize + 1) % 10 === 0 || i + batchSize >= newRatings.length) {
          console.log(`  Progress: ${inserted}/${newRatings.length} ratings inserted`);
        }
      }
    }
    
    console.log(`  ✅ ${loc.locationName}: Inserted ${inserted} ratings`);
    totalImported += inserted;
    totalErrors += errors.length;
  }
  
  console.log(`\n\n=== FINAL SUMMARY ===`);
  console.log(`Total ratings imported: ${totalImported}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`\n✅ Import complete!`);
}

main().catch(console.error);

