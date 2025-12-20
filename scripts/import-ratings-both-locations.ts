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
const LOCATIONS = {
  '04066': {
    id: '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd',
    name: 'Buda FSU',
    csvPath: path.join(process.cwd(), 'public/04066_ratingsUpdate.csv'),
  },
  '05508': {
    id: 'e437119c-27d9-4114-9273-350925016738',
    name: 'West Buda FSU',
    csvPath: path.join(process.cwd(), 'public/05508_ratingsUpdate.csv'),
  },
};

const ORG_ID = '54b9864f-9df9-4a15-a209-7b99e1c274f4';

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
    if (!line.trim()) continue;
    
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
  if (!criteriaText) return null;
  const match = criteriaText.match(/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

function parseTimestamp(timestamp: string): string {
  // Parse format like "9/1/25 12:53" to ISO format
  const [datePart, timePart] = timestamp.split(' ');
  if (!datePart || !timePart) {
    throw new Error(`Invalid timestamp format: ${timestamp}`);
  }
  
  const [month, day, year] = datePart.split('/');
  const fullYear = year.length === 2 ? `20${year}` : year;
  const [hours, minutes] = timePart.split(':');
  
  // Create ISO string
  const isoString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  const date = new Date(isoString);
  date.setSeconds(0, 0); // Normalize to minute precision
  return date.toISOString();
}

function cleanPositionName(positionName: string): string {
  // Remove Spanish text (e.g., "Drinks 1/3 | Bebidas 1/3" -> "Drinks 1/3")
  // Also handle positions like "Host | Anfitrión" -> "Host"
  let cleaned = positionName.split('|')[0].trim();
  
  // Map specific position names to match database
  const positionMap: Record<string, string> = {
    'Host | Anfitrión': 'Host',
    'Bagging | Embolsado': 'Bagging',
    'Drinks 1/3 | Bebidas 1/3': 'Drinks 1/3',
    'Drinks 2 | Bebidas 2': 'Drinks 2',
    'Primary | Primaria': 'Primary',
    'Secondary | Secundaria': 'Secondary',
    'Fries | Papas': 'Fries',
    'Breader | Empanizador': 'Breader',
    'Machines | Maquinas': 'Machines',
  };
  
  return positionMap[positionName] || cleaned;
}

async function main() {
  console.log('=== RATINGS IMPORT FOR BOTH LOCATIONS ===\n');
  
  // Step 1: Delete all existing ratings for both locations
  console.log('Step 1: Deleting existing ratings...');
  const locationIds = Object.values(LOCATIONS).map(loc => loc.id);
  
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
  
  // Step 2: Fetch all employees to create name-to-ID mapping
  console.log('Step 2: Loading employee name mappings...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, location_id, is_leader, role');
  
  if (empError || !employees) {
    console.error('Error fetching employees:', empError);
    process.exit(1);
  }
  
  // Create name-to-ID maps per location (in case same name exists in both)
  const nameToIdMap = new Map<string, Map<string, string>>();
  const firstNameToIdMap = new Map<string, Map<string, Array<{id: string, isLeader: boolean}>>>(); // For first name matching
  
  employees.forEach(emp => {
    if (emp.full_name) {
      if (!nameToIdMap.has(emp.location_id)) {
        nameToIdMap.set(emp.location_id, new Map());
        firstNameToIdMap.set(emp.location_id, new Map());
      }
      nameToIdMap.get(emp.location_id)!.set(emp.full_name, emp.id);
      
      // Also index by first name for leader matching
      const firstName = emp.first_name || emp.full_name.split(' ')[0];
      if (!firstNameToIdMap.get(emp.location_id)!.has(firstName)) {
        firstNameToIdMap.get(emp.location_id)!.set(firstName, []);
      }
      const isLeader = emp.is_leader || ['Team Lead', 'Director', 'Executive', 'Operator', 'Trainer'].includes(emp.role || '');
      firstNameToIdMap.get(emp.location_id)!.get(firstName)!.push({
        id: emp.id,
        isLeader: isLeader
      });
    }
  });
  
  console.log(`✅ Loaded employee mappings for ${employees.length} employees\n`);
  
  // Helper function to find employee ID by name (exact match or first name)
  function findEmployeeId(name: string, locationId: string, preferLeader: boolean = false): string | null {
    const locationNameMap = nameToIdMap.get(locationId);
    const locationFirstNameMap = firstNameToIdMap.get(locationId);
    
    if (!locationNameMap || !locationFirstNameMap) return null;
    
    // Try exact match first
    if (locationNameMap.has(name)) {
      return locationNameMap.get(name)!;
    }
    
    // Try first name match
    const firstName = name.split(' ')[0];
    const matchingEmployees = locationFirstNameMap.get(firstName);
    
    if (matchingEmployees && matchingEmployees.length > 0) {
      // If multiple matches and preferLeader is true, prefer leaders
      if (preferLeader && matchingEmployees.length > 1) {
        const leaderMatch = matchingEmployees.find(emp => emp.isLeader);
        if (leaderMatch) {
          return leaderMatch.id;
        }
      }
      return matchingEmployees[0].id;
    }
    
    return null;
  }
  
  // Step 3: Process each location's CSV
  let totalImported = 0;
  let totalErrors = 0;
  
  for (const [locationNumber, location] of Object.entries(LOCATIONS)) {
    console.log(`\n=== Processing ${location.name} (${locationNumber}) ===`);
    
    // Read CSV file
    if (!fs.existsSync(location.csvPath)) {
      console.error(`❌ CSV file not found: ${location.csvPath}`);
      continue;
    }
    
    const csvContent = fs.readFileSync(location.csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows from CSV`);
    
    // Get name mapping for this location (for employees)
    const locationNameMap = nameToIdMap.get(location.id) || new Map();
    
    // For raters, search across all locations in the same org (raters can be from any location)
    const allLocationIds = Array.from(nameToIdMap.keys());
    const allLocationNameMap = new Map<string, string>();
    const allLocationFirstNameMap = new Map<string, Array<{id: string, isLeader: boolean, locationId: string}>>();
    
    allLocationIds.forEach(locId => {
      const locMap = nameToIdMap.get(locId);
      const locFirstNameMap = firstNameToIdMap.get(locId);
      if (locMap) {
        locMap.forEach((id, name) => {
          allLocationNameMap.set(name, id);
        });
      }
      if (locFirstNameMap) {
        locFirstNameMap.forEach((employees, firstName) => {
          if (!allLocationFirstNameMap.has(firstName)) {
            allLocationFirstNameMap.set(firstName, []);
          }
          employees.forEach(emp => {
            allLocationFirstNameMap.get(firstName)!.push({
              ...emp,
              locationId: locId
            });
          });
        });
      }
    });
    
    // Process each CSV row
    const newRatings: any[] = [];
    const errors: string[] = [];
    
    for (const row of rows) {
      // Try exact match first, then first name match
      let employeeId = locationNameMap.get(row.tmName);
      if (!employeeId) {
        employeeId = findEmployeeId(row.tmName, location.id, false);
      }
      
      // For raters, prefer leaders and allow first name matching
      let raterId = locationNameMap.get(row.leaderName);
      if (!raterId) {
        raterId = findEmployeeId(row.leaderName, location.id, true);
      }
      
      if (!employeeId) {
        errors.push(`Employee not found: ${row.tmName}`);
        continue;
      }
      
      if (!raterId) {
        errors.push(`Rater not found: ${row.leaderName}`);
        continue;
      }
      
      let createdAt: string;
      try {
        createdAt = parseTimestamp(row.timestamp);
      } catch (err) {
        errors.push(`Invalid timestamp for ${row.tmName}: ${row.timestamp}`);
        continue;
      }
      
      const rating1 = extractNumericRating(row.criteria1);
      const rating2 = extractNumericRating(row.criteria2);
      const rating3 = extractNumericRating(row.criteria3);
      const rating4 = extractNumericRating(row.criteria4);
      const rating5 = extractNumericRating(row.criteria5);
      const ratingAvg = parseFloat(row.rating);
      
      // Clean the position name
      const cleanedPosition = cleanPositionName(row.position);
      
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
        org_id: ORG_ID,
        location_id: location.id,
      });
    }
    
    console.log(`\n${location.name} Summary:`);
    console.log(`  Total CSV rows: ${rows.length}`);
    console.log(`  Valid ratings: ${newRatings.length}`);
    console.log(`  Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n  Errors encountered:');
      errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
      if (errors.length > 10) {
        console.log(`    ... and ${errors.length - 10} more`);
      }
    }
    
    if (newRatings.length === 0) {
      console.log(`  ⚠️  No ratings to import for ${location.name}`);
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
    
    console.log(`  ✅ ${location.name}: Inserted ${inserted} ratings`);
    totalImported += inserted;
    totalErrors += errors.length;
  }
  
  console.log(`\n\n=== FINAL SUMMARY ===`);
  console.log(`Total ratings imported: ${totalImported}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`\n✅ Import complete!`);
}

main().catch(console.error);

