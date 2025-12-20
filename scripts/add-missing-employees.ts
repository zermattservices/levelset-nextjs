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

// Helper function to parse full name into first and last name
function parseName(fullName: string): { first_name: string; last_name: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: null };
  }
  const first_name = parts[0];
  const last_name = parts.slice(1).join(' ');
  return { first_name, last_name };
}

// Missing employees to add
const missingEmployees = [
  // Buda (04066) - location_id: 67e00fb2-29f5-41ce-9c1c-93e2f7f392dd
  // org_id: 54b9864f-9df9-4a15-a209-7b99e1c274f4
  {
    fullName: 'Barbara Marley',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Christian Alvarez',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Elena Rodriguez',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Jesse Euresti Jr',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Shelby Medlin',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Summer Montoya-Fowler',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Marcelino Salazar',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Emma Garcia',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Jessica Castro',
    locationNumber: '04066',
    role: 'Team Member',
  },
  {
    fullName: 'Ruby Vela',
    locationNumber: '04066',
    role: 'Team Member',
  },
  // West Buda (05508) - location_id: e437119c-27d9-4114-9273-350925016738
  // org_id: 54b9864f-9df9-4a15-a209-7b99e1c274f4
  {
    fullName: 'Vanessa Hicks',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Kaiya Ramos',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Monica Coniker',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Timothy Lane',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Carlos Hermosillo',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Elizabeth Vazquez',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Elizabeth Garcia',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Jason Luna',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Nayeli Rodriguez',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Grecia Madueno',
    locationNumber: '05508',
    role: 'Team Member',
  },
  {
    fullName: 'Jessica Badejo',
    locationNumber: '05508',
    role: 'Team Member',
  },
];

async function main() {
  console.log('Adding missing employees as inactive...\n');

  // Get location IDs
  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('id, location_number, org_id')
    .in('location_number', ['04066', '05508']);

  if (locError || !locations) {
    console.error('Error fetching locations:', locError);
    process.exit(1);
  }

  const locationMap = new Map<string, { id: string; org_id: string }>();
  locations.forEach(loc => {
    locationMap.set(loc.location_number, { id: loc.id, org_id: loc.org_id });
  });

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const emp of missingEmployees) {
    const location = locationMap.get(emp.locationNumber);
    if (!location) {
      console.error(`❌ Location ${emp.locationNumber} not found for ${emp.fullName}`);
      errors++;
      continue;
    }

    const { first_name, last_name } = parseName(emp.fullName);

    // Check if employee already exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id, full_name, active')
      .eq('first_name', first_name)
      .eq('last_name', last_name || '')
      .eq('location_id', location.id)
      .maybeSingle();

    if (existing) {
      // If exists but is active, set to inactive
      if (existing.active) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ active: false })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`❌ Error updating ${emp.fullName} to inactive:`, updateError);
          errors++;
        } else {
          console.log(`✅ Updated ${emp.fullName} to inactive (already existed)`);
          skipped++;
        }
      } else {
        console.log(`⏭️  ${emp.fullName} already exists and is inactive`);
        skipped++;
      }
      continue;
    }

    // Create new employee as inactive
    const { data: createdEmp, error: createError } = await supabase
      .from('employees')
      .insert({
        first_name,
        last_name,
        role: emp.role,
        location_id: location.id,
        org_id: location.org_id,
        active: false, // Set as inactive
        is_foh: true, // Default to FOH
        is_boh: false,
      })
      .select('id, full_name')
      .single();

    if (createError) {
      console.error(`❌ Error creating ${emp.fullName}:`, createError);
      errors++;
    } else {
      console.log(`✅ Created ${createdEmp.full_name} (${emp.locationNumber}) as inactive`);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated/Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${missingEmployees.length}`);
}

main().catch(console.error);



