/**
 * Seed Form Groups
 *
 * Creates the three system form groups for each organization:
 * - Positional Excellence
 * - Discipline
 * - Evaluations
 *
 * Run with: npx tsx scripts/seed-form-groups.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SYSTEM_GROUPS = [
  {
    name: 'Positional Excellence',
    name_es: 'Excelencia Posicional',
    description: 'Rating forms for positional performance tracking',
    description_es: 'Formularios de calificacion para seguimiento de rendimiento posicional',
    slug: 'positional_excellence',
    icon: 'RocketLaunchOutlined',
    display_order: 1,
  },
  {
    name: 'Discipline',
    name_es: 'Disciplina',
    description: 'Infraction and accountability forms',
    description_es: 'Formularios de infracciones y responsabilidad',
    slug: 'discipline',
    icon: 'GavelOutlined',
    display_order: 2,
  },
  {
    name: 'Evaluations',
    name_es: 'Evaluaciones',
    description: 'Performance evaluation forms with scored sections',
    description_es: 'Formularios de evaluacion de rendimiento con secciones puntuadas',
    slug: 'evaluations',
    icon: 'EventNoteOutlined',
    display_order: 3,
  },
];

async function seedFormGroups() {
  console.log('Fetching organizations...');

  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, name');

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError.message);
    process.exit(1);
  }

  if (!orgs || orgs.length === 0) {
    console.log('No organizations found.');
    return;
  }

  console.log(`Found ${orgs.length} organization(s). Seeding form groups...`);

  let created = 0;
  let skipped = 0;

  for (const org of orgs) {
    for (const group of SYSTEM_GROUPS) {
      // Check if group already exists for this org
      const { data: existing } = await supabase
        .from('form_groups')
        .select('id')
        .eq('org_id', org.id)
        .eq('slug', group.slug)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from('form_groups').insert({
        org_id: org.id,
        name: group.name,
        name_es: group.name_es,
        description: group.description,
        description_es: group.description_es,
        slug: group.slug,
        is_system: true,
        icon: group.icon,
        display_order: group.display_order,
      });

      if (error) {
        console.error(`Error creating "${group.name}" for org "${org.name}":`, error.message);
      } else {
        created++;
      }
    }

    console.log(`  ✓ ${org.name}: processed`);
  }

  console.log(`\nDone! Created: ${created}, Skipped (already exist): ${skipped}`);
}

seedFormGroups().catch(console.error);
