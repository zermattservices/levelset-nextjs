/**
 * Backfill setup_template_blocks for existing templates.
 * Derives block boundaries from slot changes, same logic as computeAndSaveBlocks in setup-templates.ts.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/dashboard/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function deriveBlocksFromSlots(
  slots: { position_id: string; time_slot: string; slot_count: number }[],
  scheduleStartTime: string,
  scheduleEndTime: string,
): string[] {
  const startMin = parseTimeToMinutes(scheduleStartTime);
  const endMin = parseTimeToMinutes(scheduleEndTime);

  const slotsByTime = new Map<string, Map<string, number>>();
  for (const s of slots) {
    const normalizedTime = minutesToTimeStr(parseTimeToMinutes(s.time_slot));
    if (!slotsByTime.has(normalizedTime)) {
      slotsByTime.set(normalizedTime, new Map());
    }
    slotsByTime.get(normalizedTime)!.set(s.position_id, s.slot_count);
  }

  const derivedBlocks: string[] = [];
  let prevSnapshot: string | null = null;

  for (let min = startMin; min < endMin; min += 30) {
    const timeStr = minutesToTimeStr(min);
    const posMap = slotsByTime.get(timeStr);

    const snapshot = posMap
      ? Array.from(posMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`).join('|')
      : '';

    if (min === startMin) {
      derivedBlocks.push(timeStr);
    } else if (snapshot !== prevSnapshot) {
      derivedBlocks.push(timeStr);
    }

    prevSnapshot = snapshot;
  }

  return derivedBlocks;
}

async function main() {
  // Fetch all templates with their schedules and slots
  const { data: templates, error } = await supabase
    .from('setup_templates')
    .select(`
      id, name, zone,
      setup_template_schedules(start_time, end_time),
      setup_template_slots(position_id, time_slot, slot_count)
    `);

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  console.log(`Processing ${templates?.length ?? 0} templates...\n`);

  for (const template of templates || []) {
    const schedules = (template as any).setup_template_schedules || [];
    const slots = (template as any).setup_template_slots || [];

    if (schedules.length === 0) {
      console.log(`  ${template.name}: no schedules, skipping`);
      continue;
    }

    // Use the first schedule's time range
    const sched = schedules[0];
    const derivedBlocks = deriveBlocksFromSlots(slots, sched.start_time, sched.end_time);

    console.log(`  ${template.name}: ${slots.length} slots -> ${derivedBlocks.length} blocks: [${derivedBlocks.join(', ')}]`);

    // Delete existing blocks and insert new ones
    await supabase
      .from('setup_template_blocks')
      .delete()
      .eq('template_id', template.id);

    if (derivedBlocks.length > 0) {
      const rows = derivedBlocks.map(time => ({
        template_id: template.id,
        block_time: time,
        is_custom: false,
      }));

      const { error: insertErr } = await supabase
        .from('setup_template_blocks')
        .insert(rows);

      if (insertErr) {
        console.error(`    ERROR inserting blocks for ${template.name}:`, insertErr);
      } else {
        console.log(`    Inserted ${rows.length} blocks`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
