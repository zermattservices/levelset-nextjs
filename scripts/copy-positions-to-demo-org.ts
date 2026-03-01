/**
 * Copy all positions, criteria, and pillar mappings from Riley Emter org
 * to the Andrew Dyar (demo) org, and delete all ratings from the demo org.
 *
 * Run: npx tsx scripts/copy-positions-to-demo-org.ts
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const RILEY_EMTER_ORG_ID = '88ae7722-9d14-44ce-9183-56c6e8dd70d4';
const DEMO_ORG_ID = '5cdd62ac-6083-4d66-88cf-86716658b629';

async function main() {
  console.log('=== Copy positions from Riley Emter → Demo (Andrew Dyar) org ===\n');

  // 1) Fetch all Riley Emter positions
  const { data: sourcePositions, error: posErr } = await supabase
    .from('org_positions')
    .select('*')
    .eq('org_id', RILEY_EMTER_ORG_ID)
    .order('zone')
    .order('display_order');

  if (posErr) throw new Error(`Failed to fetch source positions: ${posErr.message}`);
  console.log(`Found ${sourcePositions.length} positions in Riley Emter org`);

  // 2) Fetch all Riley Emter position criteria
  const sourcePositionIds = sourcePositions.map((p) => p.id);
  const { data: sourceCriteria, error: critErr } = await supabase
    .from('position_criteria')
    .select('*')
    .in('position_id', sourcePositionIds)
    .order('criteria_order');

  if (critErr) throw new Error(`Failed to fetch source criteria: ${critErr.message}`);
  console.log(`Found ${sourceCriteria.length} criteria across all positions\n`);

  // 3) Delete ratings from demo org
  console.log('--- Deleting ratings from demo org ---');
  const { count: ratingsDeleted, error: ratingsErr } = await supabase
    .from('ratings')
    .delete({ count: 'exact' })
    .eq('org_id', DEMO_ORG_ID);

  if (ratingsErr) throw new Error(`Failed to delete ratings: ${ratingsErr.message}`);
  console.log(`Deleted ${ratingsDeleted} ratings`);

  // 4) Delete daily_position_averages from demo org
  const { count: dpaDeleted, error: dpaErr } = await supabase
    .from('daily_position_averages')
    .delete({ count: 'exact' })
    .eq('org_id', DEMO_ORG_ID);

  if (dpaErr) throw new Error(`Failed to delete daily_position_averages: ${dpaErr.message}`);
  console.log(`Deleted ${dpaDeleted ?? 0} daily_position_averages`);

  // 5) Null out position_id on shifts referencing demo org positions
  const { data: demoPositions } = await supabase
    .from('org_positions')
    .select('id')
    .eq('org_id', DEMO_ORG_ID);

  const demoPositionIds = (demoPositions || []).map((p) => p.id);

  if (demoPositionIds.length > 0) {
    const { count: shiftsUpdated, error: shiftsErr } = await supabase
      .from('shifts')
      .update({ position_id: null })
      .in('position_id', demoPositionIds);

    if (shiftsErr) throw new Error(`Failed to null shift position_ids: ${shiftsErr.message}`);
    console.log(`Nulled position_id on ${shiftsUpdated ?? 'some'} shifts`);

    // 6) Delete position_role_permissions for demo org positions
    const { count: prpDeleted, error: prpErr } = await supabase
      .from('position_role_permissions')
      .delete({ count: 'exact' })
      .in('position_id', demoPositionIds);

    if (prpErr) throw new Error(`Failed to delete position_role_permissions: ${prpErr.message}`);
    console.log(`Deleted ${prpDeleted ?? 0} position_role_permissions`);

    // 7) Delete position_criteria for demo org positions
    const { count: critDeleted, error: critDelErr } = await supabase
      .from('position_criteria')
      .delete({ count: 'exact' })
      .in('position_id', demoPositionIds);

    if (critDelErr) throw new Error(`Failed to delete position_criteria: ${critDelErr.message}`);
    console.log(`Deleted ${critDeleted ?? 0} position_criteria`);

    // 8) Delete existing positions from demo org
    const { count: posDeleted, error: posDelErr } = await supabase
      .from('org_positions')
      .delete({ count: 'exact' })
      .eq('org_id', DEMO_ORG_ID);

    if (posDelErr) throw new Error(`Failed to delete positions: ${posDelErr.message}`);
    console.log(`Deleted ${posDeleted ?? 0} existing positions\n`);
  }

  // 9) Insert new positions (copy from Riley Emter with new UUIDs)
  console.log('--- Inserting new positions ---');
  const positionIdMap: Record<string, string> = {}; // old ID -> new ID

  const newPositions = sourcePositions.map((p) => {
    const newId = randomUUID();
    positionIdMap[p.id] = newId;
    return {
      id: newId,
      org_id: DEMO_ORG_ID,
      name: p.name,
      zone: p.zone,
      description: p.description,
      display_order: p.display_order,
      is_active: p.is_active,
      name_es: p.name_es,
      description_es: p.description_es,
      position_type: p.position_type,
      area_id: null, // areas are org-specific, don't copy
      scheduling_enabled: p.scheduling_enabled,
    };
  });

  const { error: insertPosErr } = await supabase
    .from('org_positions')
    .insert(newPositions);

  if (insertPosErr) throw new Error(`Failed to insert positions: ${insertPosErr.message}`);
  console.log(`Inserted ${newPositions.length} positions`);

  // 10) Insert new criteria (mapped to new position IDs, preserving pillar refs)
  console.log('--- Inserting new criteria ---');

  const newCriteria = sourceCriteria.map((c) => ({
    id: randomUUID(),
    position_id: positionIdMap[c.position_id],
    criteria_order: c.criteria_order,
    name: c.name,
    description: c.description,
    name_es: c.name_es,
    description_es: c.description_es,
    pillar_1_id: c.pillar_1_id, // pillars are global, same UUIDs
    pillar_2_id: c.pillar_2_id,
  }));

  // Insert in batches of 50 to avoid payload limits
  for (let i = 0; i < newCriteria.length; i += 50) {
    const batch = newCriteria.slice(i, i + 50);
    const { error: insertCritErr } = await supabase
      .from('position_criteria')
      .insert(batch);

    if (insertCritErr) throw new Error(`Failed to insert criteria batch ${i}: ${insertCritErr.message}`);
  }
  console.log(`Inserted ${newCriteria.length} criteria\n`);

  // Summary
  console.log('=== Summary ===');
  console.log(`Positions copied: ${newPositions.length}`);
  console.log(`Criteria copied:  ${newCriteria.length}`);
  console.log(`Ratings deleted:  ${ratingsDeleted}`);
  console.log('Pillar mappings preserved (pillars are global)');
  console.log('\nDone!');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
