/**
 * Verify that rating_avg calculation is now producing correct decimal values
 * Run with: npx tsx scripts/verify-rating-avg-fix.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 Verifying rating_avg calculation fix...\n');
  
  // Get sample ratings
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select('rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg')
    .not('rating_avg', 'is', null)
    .limit(20);
  
  if (error) {
    console.error('❌ Error fetching ratings:', error);
    process.exit(1);
  }
  
  console.log('Sample ratings after fix:\n');
  
  let correctCount = 0;
  let incorrectCount = 0;
  
  ratings?.forEach((r, i) => {
    const ratingValues = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5];
    const nonNullRatings = ratingValues.filter(x => x !== null) as number[];
    
    if (nonNullRatings.length === 0) return;
    
    const expectedAvg = nonNullRatings.reduce((a, b) => a + b, 0) / nonNullRatings.length;
    const storedAvg = r.rating_avg;
    const diff = Math.abs(expectedAvg - storedAvg);
    const matches = diff < 0.01;
    
    if (matches) {
      correctCount++;
    } else {
      incorrectCount++;
    }
    
    const emoji = matches ? '✅' : '❌';
    console.log(`${emoji} Row ${i + 1}: Ratings=[${ratingValues.join(', ')}]`);
    console.log(`        Expected: ${expectedAvg.toFixed(2)}, Stored: ${storedAvg}, Diff: ${diff.toFixed(4)}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Results');
  console.log('='.repeat(60));
  console.log(`   ✅ Correct: ${correctCount}`);
  console.log(`   ❌ Incorrect: ${incorrectCount}`);
  console.log('');
  
  if (incorrectCount === 0) {
    console.log('✨ All rating_avg values are correctly calculated!');
  } else {
    console.log('⚠️  Some rating_avg values are still incorrect.');
    console.log('   Make sure you ran the migration: 20251106_fix_rating_avg_decimal.sql');
  }
}

verifyFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

