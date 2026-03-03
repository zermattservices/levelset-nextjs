import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from repo root
dotenv.config({ path: path.resolve(__dirname, '../apps/dashboard/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Check all setup_templates
  console.log('=== Setup Templates ===');
  const { data: templates, error: tErr } = await supabase
    .from('setup_templates')
    .select('id, org_id, name, zone, priority, is_active');

  if (tErr) {
    console.error('Error fetching templates:', tErr);
    return;
  }

  console.log(`Found ${templates?.length ?? 0} templates:`);
  for (const t of templates || []) {
    console.log(`  - ${t.name} | zone=${t.zone} | priority=${t.priority} | active=${t.is_active} | id=${t.id}`);
  }

  // 2. Check setup_template_blocks
  console.log('\n=== Setup Template Blocks ===');
  const { data: blocks, error: bErr } = await supabase
    .from('setup_template_blocks')
    .select('*');

  if (bErr) {
    console.error('Error fetching blocks:', bErr);
  } else {
    console.log(`Found ${blocks?.length ?? 0} blocks`);
    for (const b of blocks || []) {
      console.log(`  - template_id=${b.template_id} | block_time=${b.block_time} | is_custom=${b.is_custom}`);
    }
  }

  // 3. Check setup_template_schedules
  console.log('\n=== Setup Template Schedules ===');
  const { data: schedules, error: sErr } = await supabase
    .from('setup_template_schedules')
    .select('*');

  if (sErr) {
    console.error('Error fetching schedules:', sErr);
  } else {
    console.log(`Found ${schedules?.length ?? 0} schedules`);
    for (const s of schedules || []) {
      console.log(`  - template_id=${s.template_id} | days=${JSON.stringify(s.day_of_week)} | ${s.start_time}-${s.end_time}`);
    }
  }

  // 4. Check setup_template_slots (sample)
  console.log('\n=== Setup Template Slots (first 20) ===');
  const { data: slots, error: slErr } = await supabase
    .from('setup_template_slots')
    .select('*')
    .limit(20);

  if (slErr) {
    console.error('Error fetching slots:', slErr);
  } else {
    console.log(`Found ${slots?.length ?? 0} slots (limited to 20)`);
    for (const s of slots || []) {
      console.log(`  - template_id=${s.template_id} | pos=${s.position_id} | time=${s.time_slot} | count=${s.slot_count} | req=${s.is_required}`);
    }
  }

  // 5. Try the same query the setup-resolved API uses
  console.log('\n=== Simulating setup-resolved API query (zone=FOH) ===');
  const { data: resolvedTemplates, error: rErr } = await supabase
    .from('setup_templates')
    .select(`
      id, org_id, name, zone, priority, is_active,
      setup_template_schedules(*),
      setup_template_slots(*),
      setup_template_blocks(*)
    `)
    .eq('zone', 'FOH')
    .eq('is_active', true);

  if (rErr) {
    console.error('Error in resolved query:', rErr);
  } else {
    console.log(`Found ${resolvedTemplates?.length ?? 0} active FOH templates with joins`);
    for (const t of resolvedTemplates || []) {
      const schedCount = (t as any).setup_template_schedules?.length ?? 0;
      const slotCount = (t as any).setup_template_slots?.length ?? 0;
      const blockCount = (t as any).setup_template_blocks?.length ?? 0;
      console.log(`  - ${t.name}: ${schedCount} schedules, ${slotCount} slots, ${blockCount} blocks`);
    }
  }

  // 6. Also check without zone filter
  console.log('\n=== All active templates (no zone filter) ===');
  const { data: allActive, error: aErr } = await supabase
    .from('setup_templates')
    .select('id, name, zone, is_active')
    .eq('is_active', true);

  if (aErr) {
    console.error('Error:', aErr);
  } else {
    console.log(`Found ${allActive?.length ?? 0} active templates (any zone):`);
    for (const t of allActive || []) {
      console.log(`  - ${t.name} | zone=${t.zone}`);
    }
  }
}

main().catch(console.error);
