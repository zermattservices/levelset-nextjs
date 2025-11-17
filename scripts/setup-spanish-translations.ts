import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkColumnExists(table: string, column: string): Promise<boolean> {
  try {
    // Try to select the column - if it doesn't exist, this will fail
    const { error } = await supabase
      .from(table)
      .select(column)
      .limit(1);
    
    // If error mentions column doesn't exist, return false
    if (error && (
      error.message?.includes('column') && error.message?.includes('does not exist') ||
      error.message?.includes('Could not find a relationship') ||
      error.code === 'PGRST116'
    )) {
      return false;
    }
    // If there's another error, we'll assume column exists (might be RLS or other issue)
    return !error;
  } catch (err) {
    // If we can't check, assume it doesn't exist to be safe
    return false;
  }
}

async function checkAndCreateColumns() {
  console.log('📋 Checking if Spanish translation columns exist...\n');

  // Check position_big5_labels columns
  const positionEsExists = await checkColumnExists('position_big5_labels', 'position_es');
  const label1EsExists = await checkColumnExists('position_big5_labels', 'label_1_es');
  const actionEsExists = await checkColumnExists('infractions_rubric', 'action_es');

  console.log(`  position_big5_labels.position_es: ${positionEsExists ? '✅' : '❌'}`);
  console.log(`  position_big5_labels.label_1_es: ${label1EsExists ? '✅' : '❌'}`);
  console.log(`  infractions_rubric.action_es: ${actionEsExists ? '✅' : '❌'}\n`);

  if (positionEsExists && label1EsExists && actionEsExists) {
    console.log('✅ All Spanish translation columns exist!\n');
    return true;
  }

  console.log('❌ Some columns are missing!\n');
  console.log('📝 To create the columns, run this SQL in the Supabase SQL Editor:\n');
  console.log('─'.repeat(60));
  
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251116_add_spanish_translations.sql');
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(sql);
  } else {
    console.log(`
-- Add Spanish translations to position_big5_labels
ALTER TABLE position_big5_labels
  ADD COLUMN IF NOT EXISTS position_es TEXT,
  ADD COLUMN IF NOT EXISTS label_1_es TEXT,
  ADD COLUMN IF NOT EXISTS label_2_es TEXT,
  ADD COLUMN IF NOT EXISTS label_3_es TEXT,
  ADD COLUMN IF NOT EXISTS label_4_es TEXT,
  ADD COLUMN IF NOT EXISTS label_5_es TEXT;

-- Add Spanish translations to infractions_rubric
ALTER TABLE infractions_rubric
  ADD COLUMN IF NOT EXISTS action_es TEXT;
`);
  }
  
  console.log('─'.repeat(60));
  console.log('\n💡 After running the SQL above, run this script again to populate translations.\n');
  
  return false;
}

async function populateTranslations() {
  console.log('🌍 Populating Spanish translations...\n');

  // Position translations mapping
  const positionTranslations: Record<string, string> = {
    'Host': 'Anfitrión',
    'Bagging': 'Embolsado',
    'Drinks 1/3': 'Bebidas 1/3',
    'Drinks 2': 'Bebidas 2',
    'Breader': 'Empanizador',
    'Fries': 'Papas',
    'Machines': 'Maquinas',
    'Primary': 'Primaria',
    'Secondary': 'Secundaria',
    'iPOS': 'iPOS',
    'OMD': 'OMD',
    'Runner': 'Corredor',
    'Prep': 'Preparación',
    '3H Values': 'Valores 3H',
    'Trainer': 'Entrenador',
    'Team Lead': 'Líder de Equipo',
  };

  // Update position translations
  console.log('  📍 Updating position translations...');
  let updatedCount = 0;
  for (const [english, spanish] of Object.entries(positionTranslations)) {
    // Update all rows with this position name, not just null ones
    const { data, error } = await supabase
      .from('position_big5_labels')
      .update({ position_es: spanish })
      .eq('position', english)
      .select('id');

    if (error) {
      console.warn(`    ⚠️  Could not update ${english}: ${error.message}`);
    } else {
      const count = data?.length || 0;
      if (count > 0) {
        console.log(`    ✅ Updated ${count} row(s) for ${english} → ${spanish}`);
        updatedCount += count;
      } else {
        console.log(`    ℹ️  No rows found for position: ${english}`);
      }
    }
  }
  console.log(`  ✅ Updated ${updatedCount} position translation(s)\n`);

  // Get all infractions and show what needs translation
  console.log('  📋 Checking infractions...');
  const { data: infractions, error: infractionsError } = await supabase
    .from('infractions_rubric')
    .select('id, action, action_es, points')
    .order('points');

  if (infractionsError) {
    console.warn(`    ⚠️  Could not fetch infractions: ${infractionsError.message}\n`);
  } else if (infractions) {
    const withoutTranslation = infractions.filter(i => !i.action_es);
    const withTranslation = infractions.filter(i => i.action_es);
    
    console.log(`    📊 Total infractions: ${infractions.length}`);
    console.log(`    ✅ With Spanish translation: ${withTranslation.length}`);
    console.log(`    ❌ Missing Spanish translation: ${withoutTranslation.length}\n`);
    
    if (withoutTranslation.length > 0) {
      console.log('    Missing translations:');
      withoutTranslation.forEach(inf => {
        console.log(`      - "${inf.action}" (${inf.points} points)`);
      });
      console.log('\n    💡 Add Spanish translations in Supabase for the action_es column\n');
    }
  }
}

async function main() {
  console.log('🚀 Setting up Spanish translations for PWA\n');
  console.log('='.repeat(60) + '\n');

  try {
    const columnsExist = await checkAndCreateColumns();
    
    if (!columnsExist) {
      console.log('⏸️  Please run the SQL above in Supabase SQL Editor, then run this script again.\n');
      process.exit(0);
    }

    await populateTranslations();
    
    console.log('='.repeat(60));
    console.log('✅ Setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Add Spanish translations for infractions in Supabase (action_es column)');
    console.log('   2. Add Spanish translations for Big 5 labels if needed (label_1_es through label_5_es)');
    console.log('   3. Test the PWA language switching\n');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

main();

