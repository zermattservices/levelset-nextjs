const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251220_import_ratings_05508.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration...');
    console.log(`SQL length: ${migrationSQL.length} characters`);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });
    
    if (error) {
      // Try direct query execution
      const { data: result, error: queryError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);
      
      // If that doesn't work, try executing via raw SQL
      console.log('Attempting direct SQL execution...');
      // Split by semicolons and execute in batches
      const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);
      console.log(`Found ${statements.length} statements`);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim() + ';';
        if (statement.length > 10) { // Skip empty statements
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });
            if (stmtError) {
              console.error(`Error in statement ${i + 1}:`, stmtError.message);
            } else {
              console.log(`Executed statement ${i + 1}/${statements.length}`);
            }
          } catch (err) {
            console.error(`Exception in statement ${i + 1}:`, err.message);
          }
        }
      }
    } else {
      console.log('Migration applied successfully!');
    }
    
    // Check results
    const { data: ratings, error: checkError } = await supabase
      .from('ratings')
      .select('id', { count: 'exact' })
      .eq('location_id', 'e437119c-27d9-4114-9273-350925016738');
    
    if (checkError) {
      console.error('Error checking ratings:', checkError);
    } else {
      console.log(`Ratings count: ${ratings?.length || 0}`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();



