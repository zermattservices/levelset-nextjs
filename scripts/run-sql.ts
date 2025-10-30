import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(sqlFile: string) {
  console.log(`📂 Reading SQL file: ${sqlFile}\n`);
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ File not found: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  
  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`🚀 Running ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`);
    
    const { error } = await supabase.rpc('query', { query_text: statement });
    
    if (error) {
      console.error(`❌ Statement ${i + 1} failed:`, error);
      // Continue anyway for some errors
    } else {
      console.log(`✅ Statement ${i + 1} completed`);
    }
  }

  console.log('\n✨ SQL execution complete!');
}

const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('❌ Please provide SQL file path');
  console.error('Usage: npx tsx scripts/run-sql.ts path/to/file.sql');
  process.exit(1);
}

runSQL(sqlFile).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

