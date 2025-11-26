const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '../public/05508_ratingsUpdate.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');

// West Buda location ID
const locationId = 'e437119c-27d9-4114-9273-350925016738';
const orgId = '54b9864f-9df9-4a15-a209-7b99e1c274f4';

// Position mapping (CSV format -> DB format)
const positionMap = {
  'Host | Anfitrión': 'Host',
  'Bagging | Embolsado': 'Bagging',
  'OMD': 'OMD',
  'Runner': 'Runner',
  'iPOS': 'iPOS',
  'Drinks 1/3 | Bebidas 1/3': 'Drinks 1/3',
  'Drinks 2 | Bebidas 2': 'Drinks 2',
  '3H Week FOH': '3H Week FOH',
  'Leadership FOH': 'Team Lead FOH',
  'Trainer FOH': 'Trainer FOH',
  'Primary | Primaria': 'Primary',
  'Secondary | Secundaria': 'Secondary',
  'Prep': 'Prep',
  'Fries | Papas': 'Fries',
  'Breader | Empanizador': 'Breader',
  'Machines | Maquinas': 'Machines',
  '3H Week BOH': '3H Week BOH',
  'Trainer BOH': 'Trainer BOH',
};

// Name variations mapping (CSV name -> DB name)
const nameVariations = {
  'Kayden Humpherys': 'Kayden May', // Need to verify this is the same person
  'Cassandra Mata': 'Casandra Mata',
  'Juliette Aguilar': 'Julette Aguilar',
  'Giselle Laredo': 'Giselle Loredo',
  'Colton Stark': 'Colten Stark',
  'Makenzie Layne': 'Makenzi Layne',
  'Marissa Murillo': 'Marisa Murillo',
  'Liliam Martinez': 'Lilliam Martinez',
  'Robbie George': 'Robert George',
  'Joaquin Ibarra': 'Joseph Ibarra',
  'Gael Nova': 'Gael Novoa',
  'Christopher Cruz Garcia': 'Christopher Garcia',
  'Yosbel Crespo': 'Yosbaldo Crespo Zamora',
  'Dayana Hernandez': 'Dayana Hernandez villa',
  'Claudio Garcia': 'Claudio Garcia camano',
  'Yair Oaxaca Lopez': 'Yair Oaxaca lopez',
  'Yesica Lopez': 'Yessica Lopez',
  'Nayeli Rodriguez': 'Nayeli Del Toro', // Need to verify
  'Brayan Castro': 'Brayan Castro Moreno',
  'Kaiya Ramos': 'Kianna Ramos', // Need to verify
  'Monica Coniker': 'Monica Alonso Feliciano', // Need to verify
  'Ethan Coniker': null, // Need to find
  'Timothy Lane': null, // Need to find
  'Daniel Van Cleave': null, // Need to find
  'Luke Kilstrom': null, // Need to find
  'Jason Luna': null, // Need to find
  'Nestor Reyes': null, // Need to find
  'Dominique Miller': null, // Need to find
  'Vanessa Hicks': null, // Need to find
  'Jessica Badejo': null, // Need to find
  'Carlos Hermosillo': null, // Need to find
  'Doris': null, // Need to find
  'Bessie': null, // Need to find
  'Greyca': null, // Need to find
  'Elizabeth Garcia': null, // Need to find
  'Angeles Carbajal': null, // Need to find
  'Jenny Reyes Ramos': null, // Need to find
  'Magali Rodriguez Barrera': null, // Need to find
  'Amanda Luna': null, // Need to find
  'Mina Tieu': null, // Need to find
  'Eric Reyna': null, // Need to find
  'Elizabeth Vazquez': null, // Need to find
  'Kianna Ramos': null, // Need to find
};

// Parse criteria value to integer (1, 2, or 3)
function parseCriteria(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes('Not Yet') || trimmed.includes('1')) return 1;
  if (trimmed.includes('On the Rise') || trimmed.includes('2')) return 2;
  if (trimmed.includes('Crushing It') || trimmed.includes('3')) return 3;
  return null;
}

// Parse date from format "9/30/25 13:53" to ISO timestamp
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.trim().split(' ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute] = timePart ? timePart.split(':') : ['0', '0'];
  
  // Convert 2-digit year to 4-digit (assuming 20xx)
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
  
  // Create date in UTC
  const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`);
  return date.toISOString();
}

// Parse CSV rows
const ratings = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Handle CSV with quoted fields
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField); // Add last field
  
  if (fields.length < 11) continue; // Skip invalid rows
  
  const [
    uniqueId,
    tmName,
    leaderName,
    timestamp,
    position,
    criteria1,
    criteria2,
    criteria3,
    criteria4,
    criteria5,
    rating
  ] = fields;
  
  // Clean position name (remove bilingual part)
  let cleanPosition = position.trim();
  if (cleanPosition.includes('|')) {
    cleanPosition = cleanPosition.split('|')[0].trim();
  }
  
  // Map position
  const dbPosition = positionMap[position.trim()] || cleanPosition;
  
  // Parse criteria
  const rating1 = parseCriteria(criteria1);
  const rating2 = parseCriteria(criteria2);
  const rating3 = parseCriteria(criteria3);
  const rating4 = parseCriteria(criteria4);
  const rating5 = parseCriteria(criteria5);
  
  // Parse date
  const createdAt = parseDate(timestamp);
  
  // Parse average rating
  const ratingAvg = parseFloat(rating) || null;
  
  ratings.push({
    uniqueId: uniqueId.trim(),
    tmName: tmName.trim(),
    leaderName: leaderName.trim(),
    position: dbPosition,
    rating1,
    rating2,
    rating3,
    rating4,
    rating5,
    ratingAvg,
    createdAt
  });
}

console.log(`Parsed ${ratings.length} ratings from CSV`);
console.log(`Sample rating:`, ratings[0]);

// Generate SQL migration
let sql = `-- Import ratings from 05508_ratingsUpdate.csv for West Buda
-- Location ID: ${locationId}
-- Org ID: ${orgId}
-- Total ratings: ${ratings.length}

-- First, create a temporary table to store the ratings data
CREATE TEMP TABLE temp_ratings_import (
  unique_id TEXT,
  tm_name TEXT,
  leader_name TEXT,
  position TEXT,
  rating_1 INTEGER,
  rating_2 INTEGER,
  rating_3 INTEGER,
  rating_4 INTEGER,
  rating_5 INTEGER,
  rating_avg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Insert ratings data
INSERT INTO temp_ratings_import (unique_id, tm_name, leader_name, position, rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg, created_at) VALUES
`;

const values = ratings.map(r => {
  const tmName = r.tmName.replace(/'/g, "''");
  const leaderName = r.leaderName.replace(/'/g, "''");
  const position = r.position.replace(/'/g, "''");
  return `('${r.uniqueId}', '${tmName}', '${leaderName}', '${position}', ${r.rating1 || 'NULL'}, ${r.rating2 || 'NULL'}, ${r.rating3 || 'NULL'}, ${r.rating4 || 'NULL'}, ${r.rating5 || 'NULL'}, ${r.ratingAvg || 'NULL'}, '${r.createdAt}')`;
});

sql += values.join(',\n') + ';\n\n';

sql += `-- Now insert into ratings table, matching employees by name
-- Note: This will need manual review for name matching
INSERT INTO ratings (id, employee_id, rater_user_id, position, rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg, created_at, location_id, org_id)
SELECT 
  gen_random_uuid() as id,
  e.id as employee_id,
  r.id as rater_user_id,
  t.position,
  t.rating_1,
  t.rating_2,
  t.rating_3,
  t.rating_4,
  t.rating_5,
  t.rating_avg,
  t.created_at,
  '${locationId}'::uuid as location_id,
  '${orgId}'::uuid as org_id
FROM temp_ratings_import t
JOIN employees e ON (
  -- Match employee name (handle variations)
  e.full_name = t.tm_name
  OR e.full_name = REPLACE(t.tm_name, 'Kayden Humpherys', 'Kayden May')
  OR e.full_name = REPLACE(t.tm_name, 'Cassandra Mata', 'Casandra Mata')
  OR e.full_name = REPLACE(t.tm_name, 'Juliette Aguilar', 'Julette Aguilar')
  OR e.full_name = REPLACE(t.tm_name, 'Giselle Laredo', 'Giselle Loredo')
  OR e.full_name = REPLACE(t.tm_name, 'Colton Stark', 'Colten Stark')
  OR e.full_name = REPLACE(t.tm_name, 'Makenzie Layne', 'Makenzi Layne')
  OR e.full_name = REPLACE(t.tm_name, 'Marissa Murillo', 'Marisa Murillo')
  OR e.full_name = REPLACE(t.tm_name, 'Liliam Martinez', 'Lilliam Martinez')
  OR e.full_name = REPLACE(t.tm_name, 'Robbie George', 'Robert George')
  OR e.full_name = REPLACE(t.tm_name, 'Joaquin Ibarra', 'Joseph Ibarra')
  OR e.full_name = REPLACE(t.tm_name, 'Gael Nova', 'Gael Novoa')
  OR e.full_name = REPLACE(t.tm_name, 'Christopher Cruz Garcia', 'Christopher Garcia')
  OR e.full_name = REPLACE(t.tm_name, 'Yosbel Crespo', 'Yosbaldo Crespo Zamora')
  OR e.full_name = REPLACE(t.tm_name, 'Dayana Hernandez', 'Dayana Hernandez villa')
  OR e.full_name = REPLACE(t.tm_name, 'Claudio Garcia', 'Claudio Garcia camano')
  OR e.full_name = REPLACE(t.tm_name, 'Yair Oaxaca Lopez', 'Yair Oaxaca lopez')
  OR e.full_name = REPLACE(t.tm_name, 'Yesica Lopez', 'Yessica Lopez')
  OR e.full_name = REPLACE(t.tm_name, 'Brayan Castro', 'Brayan Castro Moreno')
)
AND e.location_id = '${locationId}'::uuid
AND e.active = true
JOIN employees r ON (
  -- Match rater name (handle variations and check consolidated employees)
  r.full_name = t.leader_name
  OR r.full_name = REPLACE(t.leader_name, 'Kaiya Ramos', 'Kianna Ramos')
  OR r.full_name = REPLACE(t.leader_name, 'Monica Coniker', 'Monica Alonso Feliciano')
  OR r.full_name = REPLACE(t.leader_name, 'Nayeli Rodriguez', 'Nayeli Del Toro')
)
AND (
  r.location_id = '${locationId}'::uuid
  OR r.consolidated_employee_id IN (
    SELECT id FROM employees WHERE location_id = '${locationId}'::uuid
  )
)
AND r.active = true
WHERE NOT EXISTS (
  -- Avoid duplicates based on unique_id or same employee/rater/position/timestamp
  SELECT 1 FROM ratings r2
  WHERE r2.employee_id = e.id
    AND r2.rater_user_id = r.id
    AND r2.position = t.position
    AND r2.created_at = t.created_at
);

-- Show summary
SELECT 
  COUNT(*) as total_imported,
  COUNT(DISTINCT employee_id) as unique_employees_rated,
  COUNT(DISTINCT rater_user_id) as unique_raters
FROM ratings
WHERE location_id = '${locationId}'::uuid
  AND created_at >= (SELECT MIN(created_at) FROM temp_ratings_import);

-- Clean up
DROP TABLE temp_ratings_import;
`;

// Write SQL file
const sqlPath = path.join(__dirname, '../supabase/migrations/20251220_import_ratings_05508.sql');
fs.writeFileSync(sqlPath, sql);

console.log(`\nGenerated SQL migration: ${sqlPath}`);
console.log(`\n⚠️  IMPORTANT: Review the name matching logic before applying this migration.`);
console.log(`Some names may need manual mapping, especially for leaders who might be from Buda.`);



