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

// Multi-location employees: West Buda employees that should be linked to Buda employees
const multiLocationEmployees = [
  'Vanessa Hicks',
  'Kaiya Ramos',
  'Monica Coniker',
  'Timothy Lane',
  'Carlos Hermosillo',
  'Elizabeth Vazquez',
  'Elizabeth Garcia',
  'Jason Luna',
  'Nayeli Rodriguez',
  'Grecia Madueno',
  'Jessica Badejo',
];

async function main() {
  console.log('Fixing consolidated employee relationships...\n');

  // Get location IDs
  const budaLocationId = '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd'; // 04066
  const westBudaLocationId = 'e437119c-27d9-4114-9273-350925016738'; // 05508
  const orgId = '54b9864f-9df9-4a15-a209-7b99e1c274f4';

  // Step 1: Get all Buda employees for these names
  console.log('Step 1: Fetching Buda employees...');
  const { data: budaEmployees, error: budaError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, role, consolidated_employee_id')
    .eq('location_id', budaLocationId)
    .in('full_name', multiLocationEmployees);

  if (budaError || !budaEmployees) {
    console.error('Error fetching Buda employees:', budaError);
    process.exit(1);
  }

  console.log(`Found ${budaEmployees.length} Buda employees\n`);

  // Step 2: Get the incorrectly created West Buda employees (before deleting)
  console.log('Step 2: Fetching duplicate West Buda employees...');
  const { data: westBudaDuplicates, error: fetchError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('location_id', westBudaLocationId)
    .in('full_name', multiLocationEmployees);

  if (fetchError) {
    console.error('Error fetching duplicates:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${westBudaDuplicates?.length || 0} duplicate West Buda employees\n`);

  // Create a map of full_name -> duplicate employee id
  const duplicateMap = new Map<string, string>();
  westBudaDuplicates?.forEach(emp => {
    duplicateMap.set(emp.full_name, emp.id);
  });

  // Step 3: Create proper West Buda employee records linked to Buda employees
  console.log('Step 3: Creating/updating proper West Buda employee records...');
  const nameToCorrectIdMap = new Map<string, string>(); // Maps full_name -> correct West Buda employee id
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const budaEmp of budaEmployees) {
    // Determine the consolidated_employee_id
    // If Buda employee has consolidated_employee_id pointing to itself, use that
    // Otherwise, use the Buda employee's id as the consolidated id
    const consolidatedId = budaEmp.consolidated_employee_id || budaEmp.id;

    // Check if West Buda employee already exists (the duplicate we need to fix)
    const duplicateId = duplicateMap.get(budaEmp.full_name);
    const existingWestBuda = duplicateId 
      ? { id: duplicateId, consolidated_employee_id: null }
      : null;

    if (existingWestBuda) {
      // Update existing duplicate record to have correct consolidated_employee_id
      const { data: updatedEmp, error: updateError } = await supabase
        .from('employees')
        .update({ consolidated_employee_id: consolidatedId })
        .eq('id', existingWestBuda.id)
        .select('id, full_name, consolidated_employee_id')
        .single();

      if (updateError) {
        console.error(`❌ Error updating ${budaEmp.full_name}:`, updateError);
        errors++;
      } else {
        console.log(`✅ Updated ${updatedEmp.full_name} (West Buda) to link to Buda employee (consolidated_id: ${consolidatedId})`);
        nameToCorrectIdMap.set(budaEmp.full_name, updatedEmp.id);
        updated++;
      }
    } else {
      // Create new West Buda employee record
      const { data: createdEmp, error: createError } = await supabase
        .from('employees')
        .insert({
          first_name: budaEmp.first_name,
          last_name: budaEmp.last_name,
          role: budaEmp.role,
          location_id: westBudaLocationId,
          org_id: orgId,
          active: false, // Inactive as requested
          is_foh: true,
          is_boh: false,
          consolidated_employee_id: consolidatedId, // Link to Buda employee
        })
        .select('id, full_name, consolidated_employee_id')
        .single();

      if (createError) {
        console.error(`❌ Error creating ${budaEmp.full_name}:`, createError);
        errors++;
      } else {
        console.log(`✅ Created ${createdEmp.full_name} (West Buda) linked to Buda employee (consolidated_id: ${consolidatedId})`);
        nameToCorrectIdMap.set(budaEmp.full_name, createdEmp.id);
        created++;
      }
    }
  }

  // Step 4: Update ratings to point to correct employees
  console.log('\nStep 4: Updating ratings to reference correct employees...');
  let ratingsUpdated = 0;
  let ratingsErrors = 0;

  for (const [fullName, correctId] of nameToCorrectIdMap.entries()) {
    const duplicateId = duplicateMap.get(fullName);
    if (!duplicateId) continue;

    // Update ratings where this employee is the rated employee (at West Buda location)
    const { data: empRatings, error: empRatingsError } = await supabase
      .from('ratings')
      .update({ employee_id: correctId })
      .eq('employee_id', duplicateId)
      .eq('location_id', westBudaLocationId)
      .select('id');

    if (empRatingsError) {
      console.error(`❌ Error updating employee ratings for ${fullName}:`, empRatingsError);
      ratingsErrors++;
    } else {
      if (empRatings && empRatings.length > 0) {
        console.log(`   Updated ${empRatings.length} ratings where ${fullName} is the employee`);
        ratingsUpdated += empRatings.length;
      }
    }

    // Update ratings where this employee is the rater
    const { data: raterRatings, error: raterRatingsError } = await supabase
      .from('ratings')
      .update({ rater_user_id: correctId })
      .eq('rater_user_id', duplicateId)
      .select('id');

    if (raterRatingsError) {
      console.error(`❌ Error updating rater ratings for ${fullName}:`, raterRatingsError);
      ratingsErrors++;
    } else {
      if (raterRatings && raterRatings.length > 0) {
        console.log(`   Updated ${raterRatings.length} ratings where ${fullName} is the rater`);
        ratingsUpdated += raterRatings.length;
      }
    }
  }

  console.log(`\n   Total ratings updated: ${ratingsUpdated}`);
  if (ratingsErrors > 0) {
    console.log(`   Rating update errors: ${ratingsErrors}`);
  }

  // Step 5: Now we can safely delete any remaining duplicates (shouldn't be any, but just in case)
  console.log('\nStep 5: Checking for any remaining duplicates to clean up...');
  const remainingDuplicates = Array.from(duplicateMap.values()).filter(id => 
    !Array.from(nameToCorrectIdMap.values()).includes(id)
  );

  if (remainingDuplicates.length > 0) {
    // Check if these are still referenced
    const { data: stillReferenced } = await supabase
      .from('ratings')
      .select('id')
      .in('employee_id', remainingDuplicates)
      .limit(1);
    
    const { data: stillReferencedAsRater } = await supabase
      .from('ratings')
      .select('id')
      .in('rater_user_id', remainingDuplicates)
      .limit(1);

    if ((!stillReferenced || stillReferenced.length === 0) && 
        (!stillReferencedAsRater || stillReferencedAsRater.length === 0)) {
      const { error: finalDeleteError } = await supabase
        .from('employees')
        .delete()
        .in('id', remainingDuplicates);

      if (finalDeleteError) {
        console.error('Error deleting remaining duplicates:', finalDeleteError);
      } else {
        console.log(`✅ Deleted ${remainingDuplicates.length} remaining duplicate employees`);
      }
    } else {
      console.log(`⚠️  ${remainingDuplicates.length} duplicates still referenced in ratings, skipping deletion`);
    }
  } else {
    console.log('✅ No remaining duplicates to clean up');
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);

  // Step 5: Re-run the import to link ratings to correct employees
  console.log('\n⚠️  IMPORTANT: You need to re-run the import script to link ratings to the correct employee records.');
  console.log('   Run: npx tsx scripts/import-ratings-from-csv.ts');
}

main().catch(console.error);

