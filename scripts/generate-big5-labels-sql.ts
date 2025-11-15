/**
 * Interactive script to generate SQL INSERT statements for Big 5 labels
 * 
 * Usage:
 * 1. Run: npx tsx scripts/generate-big5-labels-sql.ts
 * 2. Follow prompts to enter labels from Google Sheet row 2 for each position
 * 3. Copy generated SQL to Supabase SQL Editor
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

// CFA Buda location IDs
const LOCATIONS = {
  'CFA Buda': '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd',
  'CFA West Buda': 'e437119c-27d9-4114-9273-350925016738'
};
const ORG_ID = '54b9864f-9df9-4a15-a209-7b99e1c274f4';

// All positions that need Big 5 labels
const ALL_POSITIONS = [
  { name: 'iPOS', zone: 'FOH' },
  { name: 'Host', zone: 'FOH' },
  { name: 'OMD', zone: 'FOH' },
  { name: 'Runner', zone: 'FOH' },
  { name: 'Bagging', zone: 'FOH' },
  { name: 'Drinks 1/3', zone: 'FOH' },
  { name: 'Drinks 2', zone: 'FOH' },
  { name: '3H Week FOH', zone: 'FOH' },
  { name: 'Trainer FOH', zone: 'FOH' },
  { name: 'FOH Team Lead', zone: 'FOH' },
  { name: 'Breader', zone: 'BOH' },
  { name: 'Secondary', zone: 'BOH' },
  { name: 'Fries', zone: 'BOH' },
  { name: 'Primary', zone: 'BOH' },
  { name: 'Machines', zone: 'BOH' },
  { name: 'Prep', zone: 'BOH' },
  { name: '3H Week BOH', zone: 'BOH' },
  { name: 'Trainer BOH', zone: 'BOH' },
  { name: 'BOH Team Lead', zone: 'BOH' }
] as const;

async function generateSQL() {
  console.log('\n📋 Big 5 Labels SQL Generator\n');
  console.log('This will generate INSERT statements for position_big5_labels table.');
  console.log('For each position, paste the 5 labels from row 2 of that position\'s tab in the Google Sheet.\n');
  console.log('Separate labels with commas (e.g., "Speed,Accuracy,Friendliness,Upselling,Cleanliness")\n');

  const inserts: string[] = [];

  for (const position of ALL_POSITIONS) {
    console.log(`\n📍 Position: ${position.name} (${position.zone})`);
    console.log('   (Press Enter to skip if this position doesn\'t exist in your sheet)\n');
    
    const labelsInput = await question(`   Enter 5 labels separated by commas: `);
    
    if (!labelsInput.trim()) {
      console.log('   ⏭️  Skipped\n');
      continue;
    }

    const labels = labelsInput.split(',').map(l => l.trim());
    
    if (labels.length !== 5) {
      console.log(`   ⚠️  Warning: Expected 5 labels, got ${labels.length}. Skipping this position.\n`);
      continue;
    }

    // Generate INSERT for both locations (Buda and West Buda have same positions/labels)
    Object.entries(LOCATIONS).forEach(([locationName, locationId]) => {
      inserts.push(`
-- ${position.name} @ ${locationName}
INSERT INTO position_big5_labels (org_id, location_id, position, zone, label_1, label_2, label_3, label_4, label_5)
VALUES (
  '${ORG_ID}',
  '${locationId}',
  '${position.name}',
  '${position.zone}',
  '${labels[0]}',
  '${labels[1]}',
  '${labels[2]}',
  '${labels[3]}',
  '${labels[4]}'
)
ON CONFLICT (org_id, location_id, position) 
DO UPDATE SET
  zone = EXCLUDED.zone,
  label_1 = EXCLUDED.label_1,
  label_2 = EXCLUDED.label_2,
  label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4,
  label_5 = EXCLUDED.label_5,
  updated_at = NOW();`);
    });

    console.log(`   ✅ Added: ${labels.join(', ')}\n`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📄 Generated SQL:\n');
  console.log(inserts.join('\n'));
  console.log('\n' + '='.repeat(80));
  console.log('\n✨ Copy the SQL above and run it in your Supabase SQL Editor!\n');

  rl.close();
}

generateSQL().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});

