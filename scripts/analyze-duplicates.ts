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
  console.log('Fetching all ratings with employee names...');
  
  const { data: allRatings, error } = await supabase
    .from('ratings')
    .select(`
      id,
      employee_id,
      rater_user_id,
      position,
      rating_1,
      rating_2,
      rating_3,
      rating_4,
      rating_5,
      created_at,
      employees!ratings_employee_id_fkey(full_name),
      rater:employees!ratings_rater_user_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false });
  
  if (error || !allRatings) {
    console.error('Error fetching ratings:', error);
    process.exit(1);
  }
  
  console.log(`Total ratings in database: ${allRatings.length}\n`);
  
  // Check for exact duplicates (same employee, rater, position, and all 5 ratings)
  const exactDuplicates = new Map<string, any[]>();
  
  for (const rating of allRatings) {
    const employeeName = (rating.employees as any)?.full_name || 'Unknown';
    const raterName = (rating.rater as any)?.full_name || 'Unknown';
    
    const key = `${rating.employee_id}|${rating.rater_user_id}|${rating.position}|${rating.rating_1}|${rating.rating_2}|${rating.rating_3}|${rating.rating_4}|${rating.rating_5}`;
    
    if (!exactDuplicates.has(key)) {
      exactDuplicates.set(key, []);
    }
    
    exactDuplicates.get(key)!.push({
      id: rating.id,
      employee: employeeName,
      rater: raterName,
      position: rating.position,
      created_at: rating.created_at,
      ratings: `${rating.rating_1}, ${rating.rating_2}, ${rating.rating_3}, ${rating.rating_4}, ${rating.rating_5}`,
    });
  }
  
  // Find groups with duplicates
  const duplicateGroups: any[] = [];
  exactDuplicates.forEach((group, key) => {
    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  });
  
  console.log(`=== EXACT DUPLICATE ANALYSIS ===`);
  console.log(`Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`Total duplicate rating instances: ${duplicateGroups.reduce((sum, g) => sum + g.length, 0)}`);
  console.log(`Ratings that would be kept: ${duplicateGroups.length}`);
  console.log(`Ratings that would be deleted: ${duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0)}\n`);
  
  if (duplicateGroups.length > 0) {
    console.log('First 5 duplicate groups:');
    duplicateGroups.slice(0, 5).forEach((group, idx) => {
      console.log(`\nGroup ${idx + 1}: ${group.length} copies`);
      group.forEach((r: any) => {
        console.log(`  - ID: ${r.id} | ${r.employee} rated by ${r.rater} | ${r.position} | ${r.ratings} | ${new Date(r.created_at).toLocaleString()}`);
      });
    });
  }
}

main().catch(console.error);

