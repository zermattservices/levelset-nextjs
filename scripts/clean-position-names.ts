import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching all ratings...');
  
  const { data: allRatings, error } = await supabase
    .from('ratings')
    .select('id, position');
  
  if (error || !allRatings) {
    console.error('Error fetching ratings:', error);
    process.exit(1);
  }
  
  console.log(`Total ratings: ${allRatings.length}\n`);
  
  // Find all positions with Spanish text (containing " | ")
  const positionsToUpdate: Array<{ id: string; oldPosition: string; newPosition: string }> = [];
  
  for (const rating of allRatings) {
    if (rating.position.includes(' | ')) {
      // Remove everything after and including " | "
      const cleanPosition = rating.position.split(' | ')[0];
      positionsToUpdate.push({
        id: rating.id,
        oldPosition: rating.position,
        newPosition: cleanPosition,
      });
    }
  }
  
  console.log(`Ratings with Spanish text in position: ${positionsToUpdate.length}`);
  
  if (positionsToUpdate.length === 0) {
    console.log('No positions need cleaning!');
    return;
  }
  
  // Show unique position mappings
  const uniqueMappings = new Map<string, string>();
  positionsToUpdate.forEach(p => uniqueMappings.set(p.oldPosition, p.newPosition));
  
  console.log('\nPosition mappings:');
  uniqueMappings.forEach((newPos, oldPos) => {
    console.log(`  "${oldPos}" → "${newPos}"`);
  });
  
  console.log(`\nReady to update ${positionsToUpdate.length} ratings.`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Update each rating
  let updated = 0;
  
  for (const { id, newPosition } of positionsToUpdate) {
    const { error: updateError } = await supabase
      .from('ratings')
      .update({ position: newPosition })
      .eq('id', id);
    
    if (updateError) {
      console.error(`Error updating rating ${id}:`, updateError);
    } else {
      updated++;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${positionsToUpdate.length}...`);
      }
    }
  }
  
  console.log(`\n✅ Cleanup complete! Updated ${updated} position names.`);
}

main().catch(console.error);

