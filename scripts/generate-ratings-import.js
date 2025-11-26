#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const BUDA_LOCATION_ID = '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd';
const WEST_BUDA_LOCATION_ID = 'e437119c-27d9-4114-9273-350925016738';
const ORG_ID = '54b9864f-9df9-4a15-a209-7b99e1c274f4';

function parseRating(text) {
  const lower = text.toLowerCase();
  if (lower.includes('crushing it') || text === '3') return 3;
  if (lower.includes('on the rise') || text === '2') return 2;
  if (lower.includes('not yet') || text === '1') return 1;
  return null;
}

function cleanPosition(position) {
  // Remove Spanish translation part (everything after " | ")
  return position.split(' | ')[0].trim();
}

function parseTimestamp(ts) {
  // Parse MM/DD/YY HH:MM format
  const parts = ts.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/);
  if (!parts) return null;
  
  const [, month, day, year, hour, minute] = parts;
  // Convert 2-digit year to 4-digit (assuming 20xx)
  const fullYear = `20${year}`;
  
  // Create ISO timestamp
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00.000Z`;
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lines = cleanContent.split('\n').filter(line => line.trim());
  
  const headers = lines[0].split(',');
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
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
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx];
      });
      rows.push(row);
    }
  }
  
  return rows;
}

function generateInsertStatements(rows, locationId, locationName) {
  const statements = [];
  
  for (const row of rows) {
    const uniqueId = row['Unique ID'];
    const tmName = escapeSql(row['TM Name']);
    const leaderName = escapeSql(row['Leader Name']);
    const timestamp = parseTimestamp(row['Timestamp']);
    const position = cleanPosition(row['Position']);
    const rating1 = parseRating(row['Criteria 1']);
    const rating2 = parseRating(row['Criteria 2']);
    const rating3 = parseRating(row['Criteria 3']);
    const rating4 = parseRating(row['Criteria 4']);
    const rating5 = parseRating(row['Criteria 5']);
    
    if (!timestamp) {
      console.error(`Warning: Invalid timestamp for row ${uniqueId}: ${row['Timestamp']}`);
      continue;
    }
    
    statements.push(
      `('${uniqueId}', '${tmName}', '${leaderName}', '${timestamp}'::timestamptz, '${position}', ${rating1}, ${rating2}, ${rating3}, ${rating4}, ${rating5}, '${locationId}')`
    );
  }
  
  return statements;
}

// Parse both CSV files
console.log('Parsing CSV files...');
const budaRows = parseCsv(path.join(__dirname, '../public/04066_ratingsUpdate.csv'));
const westBudaRows = parseCsv(path.join(__dirname, '../public/05508_ratingsUpdate.csv'));

console.log(`Buda rows: ${budaRows.length}`);
console.log(`West Buda rows: ${westBudaRows.length}`);

// Generate migration
const migration = `-- Import all ratings for Buda and West Buda
-- Generated: ${new Date().toISOString()}
-- Buda (04066): ${BUDA_LOCATION_ID} (${budaRows.length} ratings)
-- West Buda (05508): ${WEST_BUDA_LOCATION_ID} (${westBudaRows.length} ratings)
-- Org ID: ${ORG_ID}

-- Create temporary table
CREATE TEMP TABLE temp_ratings_import (
  unique_id TEXT,
  tm_name TEXT,
  leader_name TEXT,
  timestamp TIMESTAMPTZ,
  position TEXT,
  rating_1 INTEGER,
  rating_2 INTEGER,
  rating_3 INTEGER,
  rating_4 INTEGER,
  rating_5 INTEGER,
  location_id UUID
);

-- Insert Buda ratings
INSERT INTO temp_ratings_import (unique_id, tm_name, leader_name, timestamp, position, rating_1, rating_2, rating_3, rating_4, rating_5, location_id) VALUES
${generateInsertStatements(budaRows, BUDA_LOCATION_ID, 'Buda').join(',\n')};

-- Insert West Buda ratings
INSERT INTO temp_ratings_import (unique_id, tm_name, leader_name, timestamp, position, rating_1, rating_2, rating_3, rating_4, rating_5, location_id) VALUES
${generateInsertStatements(westBudaRows, WEST_BUDA_LOCATION_ID, 'West Buda').join(',\n')};

-- Insert into ratings table with employee/rater matching
INSERT INTO ratings (id, employee_id, rater_user_id, position, rating_1, rating_2, rating_3, rating_4, rating_5, created_at, location_id, org_id)
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
  t.timestamp as created_at,
  t.location_id,
  '${ORG_ID}'::uuid as org_id
FROM temp_ratings_import t
JOIN employees e ON (
  -- Match employee name (handle common variations)
  e.full_name = t.tm_name
  -- Add common name mappings here if needed
)
AND (e.location_id = t.location_id OR e.consolidated_employee_id IN (
  SELECT id FROM employees WHERE location_id = t.location_id
))
JOIN employees r ON (
  -- Match rater name (handle common variations)
  r.full_name = t.leader_name
  -- Add common name mappings here if needed
)
AND r.org_id = '${ORG_ID}'::uuid
AND r.active = true;

-- Report results
SELECT 
  l.location_name,
  COUNT(*) as ratings_imported
FROM ratings r
JOIN locations l ON r.location_id = l.id
WHERE r.location_id IN ('${BUDA_LOCATION_ID}', '${WEST_BUDA_LOCATION_ID}')
GROUP BY l.location_name, l.id
ORDER BY l.location_name;

-- Drop temp table
DROP TABLE temp_ratings_import;
`;

// Write migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20251126_import_all_ratings.sql');
fs.writeFileSync(migrationPath, migration);

console.log(`\nMigration generated: ${migrationPath}`);
console.log(`Total ratings to import: ${budaRows.length + westBudaRows.length}`);

