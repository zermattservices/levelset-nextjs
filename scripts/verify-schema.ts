/**
 * Verify database schema for infractions and disc_actions tables
 * Run with: npx tsx scripts/verify-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');

  try {
    // Check infractions table structure
    console.log('📋 INFRACTIONS TABLE:');
    console.log('─'.repeat(60));
    
    const { data: infractionsData, error: infractionsError } = await supabase
      .from('infractions')
      .select('*')
      .limit(1);

    if (infractionsError) {
      console.error('❌ Error accessing infractions table:', infractionsError);
    } else {
      if (infractionsData && infractionsData.length > 0) {
        const sample = infractionsData[0];
        console.log('✅ Table exists');
        console.log('\nSample record structure:');
        console.log(JSON.stringify(sample, null, 2));
        console.log('\nFields found:');
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = value === null ? 'null' : typeof value;
          console.log(`  - ${key}: ${type}`);
        });
      } else {
        console.log('⚠️  Table exists but is empty. Checking schema...');
        
        // Query information_schema for column details
        const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'infractions'
            ORDER BY ordinal_position;
          `
        });
        
        if (!schemaError && schemaData) {
          console.log('Columns:', schemaData);
        }
      }
    }

    console.log('\n');

    // Check disc_actions table structure
    console.log('📋 DISC_ACTIONS TABLE:');
    console.log('─'.repeat(60));
    
    const { data: actionsData, error: actionsError } = await supabase
      .from('disc_actions')
      .select('*')
      .limit(1);

    if (actionsError) {
      console.error('❌ Error accessing disc_actions table:', actionsError.message);
      
      // Table might not exist, that's okay
      if (actionsError.message.includes('does not exist') || actionsError.code === '42P01') {
        console.log('ℹ️  Table does not exist yet - may need to be created');
      }
    } else {
      if (actionsData && actionsData.length > 0) {
        const sample = actionsData[0];
        console.log('✅ Table exists');
        console.log('\nSample record structure:');
        console.log(JSON.stringify(sample, null, 2));
        console.log('\nFields found:');
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = value === null ? 'null' : typeof value;
          console.log(`  - ${key}: ${type}`);
        });
      } else {
        console.log('⚠️  Table exists but is empty');
      }
    }

    console.log('\n');

    // Check disc_actions_rubric table structure
    console.log('📋 DISC_ACTIONS_RUBRIC TABLE:');
    console.log('─'.repeat(60));
    
    const { data: rubricData, error: rubricError } = await supabase
      .from('disc_actions_rubric')
      .select('*')
      .limit(1);

    if (rubricError) {
      console.error('❌ Error accessing disc_actions_rubric table:', rubricError);
    } else {
      if (rubricData && rubricData.length > 0) {
        const sample = rubricData[0];
        console.log('✅ Table exists');
        console.log('\nSample record structure:');
        console.log(JSON.stringify(sample, null, 2));
        console.log('\nFields found:');
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = value === null ? 'null' : typeof value;
          console.log(`  - ${key}: ${type}`);
        });
      } else {
        console.log('⚠️  Table exists but is empty');
      }
    }

    console.log('\n');

    // Try to query actual data to see full structure
    console.log('📋 SAMPLE INFRACTIONS WITH POTENTIAL JOINS:');
    console.log('─'.repeat(60));
    
    const { data: fullInfractions, error: fullInfError } = await supabase
      .from('infractions')
      .select('*')
      .limit(3);

    if (!fullInfError && fullInfractions && fullInfractions.length > 0) {
      console.log(`Found ${fullInfractions.length} sample infractions:`);
      fullInfractions.forEach((inf, idx) => {
        console.log(`\nInfraction ${idx + 1}:`);
        console.log(JSON.stringify(inf, null, 2));
      });
    }

    console.log('\n✅ Schema verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
  }
}

verifySchema().then(() => {
  console.log('\n👋 Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

