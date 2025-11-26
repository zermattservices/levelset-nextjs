const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20251220_import_ratings_05508.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Output the SQL to stdout so it can be piped or used
console.log(migrationSQL);



