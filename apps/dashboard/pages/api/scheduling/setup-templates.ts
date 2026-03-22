import { withAuth } from '@/lib/permissions/middleware';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { setCorsOrigin } from '@/lib/cors';

// ── Block derivation helpers ──────────────────────────────────────────

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Derive block boundaries from template slots.
 * A block is created at the first time slot and wherever any position's
 * configuration (slot_count or existence) changes from the previous slot.
 */
function deriveBlocksFromSlots(
  slots: { position_id: string; time_slot: string; slot_count: number }[],
  scheduleStartTime: string,
  scheduleEndTime: string,
): string[] {
  const startMin = parseTimeToMinutes(scheduleStartTime);
  const endMin = parseTimeToMinutes(scheduleEndTime);

  // Build a lookup: timeSlot -> { positionId -> slotCount }
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

    // Build a deterministic snapshot string for comparison
    const snapshot = posMap
      ? Array.from(posMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`).join('|')
      : '';

    if (min === startMin) {
      // Always create a block at the start
      derivedBlocks.push(timeStr);
    } else if (snapshot !== prevSnapshot) {
      // Configuration changed — new block boundary
      derivedBlocks.push(timeStr);
    }

    prevSnapshot = snapshot;
  }

  return derivedBlocks;
}

/**
 * Compute and save blocks for a template.
 * Merges derived blocks with existing custom blocks.
 */
async function computeAndSaveBlocks(
  supabase: any,
  templateId: string,
  slots: { position_id: string; time_slot: string; slot_count: number }[],
  scheduleStartTime: string,
  scheduleEndTime: string,
  customBlocksOverride?: string[],
) {
  // 1. Derive blocks from slots
  const derivedTimes = deriveBlocksFromSlots(slots, scheduleStartTime, scheduleEndTime);

  const customTimes = new Set<string>();
  const schedStart = parseTimeToMinutes(scheduleStartTime);
  const schedEnd = parseTimeToMinutes(scheduleEndTime);

  if (customBlocksOverride) {
    // Use provided custom blocks from the editor
    for (const time of customBlocksOverride) {
      const normalizedTime = minutesToTimeStr(parseTimeToMinutes(time));
      const blockMin = parseTimeToMinutes(normalizedTime);
      if (blockMin >= schedStart && blockMin < schedEnd) {
        customTimes.add(normalizedTime);
      }
    }
  } else {
    // Fallback: read existing custom blocks from DB
    const { data: existingBlocks } = await supabase
      .from('setup_template_blocks')
      .select('block_time, is_custom')
      .eq('template_id', templateId)
      .eq('is_custom', true);

    for (const b of existingBlocks || []) {
      const normalizedTime = minutesToTimeStr(parseTimeToMinutes(b.block_time));
      const blockMin = parseTimeToMinutes(normalizedTime);
      if (blockMin >= schedStart && blockMin < schedEnd) {
        customTimes.add(normalizedTime);
      }
    }
  }

  // 3. Merge: union of derived + custom, deduplicate
  const allBlockTimes = new Set(derivedTimes.concat(Array.from(customTimes)));
  const sorted = Array.from(allBlockTimes).sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

  // 4. Delete all existing blocks, insert new set
  await supabase
    .from('setup_template_blocks')
    .delete()
    .eq('template_id', templateId);

  if (sorted.length > 0) {
    const rows = sorted.map(time => ({
      template_id: templateId,
      block_time: time,
      is_custom: customTimes.has(time) && !derivedTimes.includes(time),
    }));

    const { error: insertError } = await supabase
      .from('setup_template_blocks')
      .insert(rows);

    if (insertError) {
      console.error('Error inserting template blocks:', insertError);
    }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const supabase = createServerSupabaseClient();

    if (req.method === 'GET') {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({ error: 'org_id is required' });
      }

      const { data, error } = await supabase
        .from('setup_templates')
        .select('*, schedules:setup_template_schedules(*), slots:setup_template_slots(*), blocks:setup_template_blocks(*)')
        .eq('org_id', org_id)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching setup templates:', error);
        return res.status(500).json({ error: 'Failed to fetch setup templates' });
      }

      return res.status(200).json({ templates: data || [] });
    }

    if (req.method === 'POST') {
      const { intent } = req.body;

      if (intent === 'create') {
        const { org_id, name, zone, priority, schedules, slots, customBlocks } = req.body;

        if (!org_id || !name) {
          return res.status(400).json({ error: 'org_id and name are required' });
        }

        // Insert the template
        const { data: template, error: templateError } = await supabase
          .from('setup_templates')
          .insert({
            org_id,
            name,
            zone: zone || null,
            priority: priority ?? 0,
            is_active: true,
          })
          .select()
          .single();

        if (templateError) {
          console.error('Error creating setup template:', templateError);
          return res.status(500).json({ error: 'Failed to create setup template' });
        }

        // Insert schedules if provided
        let templateSchedules: any[] = [];
        if (schedules && Array.isArray(schedules) && schedules.length > 0) {
          const { data: schedData, error: schedError } = await supabase
            .from('setup_template_schedules')
            .insert(
              schedules.map((s: any) => ({
                template_id: template.id,
                day_of_week: s.day_of_week,
                start_time: s.start_time,
                end_time: s.end_time,
              }))
            )
            .select();

          if (schedError) {
            console.error('Error creating template schedules:', schedError);
            // Template was created, but schedules failed
          } else {
            templateSchedules = schedData || [];
          }
        }

        // Insert slots if provided
        let templateSlots: any[] = [];
        if (slots && Array.isArray(slots) && slots.length > 0) {
          const { data: slotData, error: slotError } = await supabase
            .from('setup_template_slots')
            .insert(
              slots.map((s: any) => ({
                template_id: template.id,
                position_id: s.position_id,
                time_slot: s.time_slot || null,
                slot_count: s.slot_count ?? 1,
                is_required: s.is_required ?? false,
              }))
            )
            .select();

          if (slotError) {
            console.error('Error creating template slots:', slotError);
            // Template was created, but slots failed
          } else {
            templateSlots = slotData || [];
          }
        }

        // Compute and save blocks from the saved slots
        const schedStartTime = schedules?.[0]?.start_time ?? '06:00';
        const schedEndTime = schedules?.[0]?.end_time ?? '22:00';
        await computeAndSaveBlocks(supabase, template.id, templateSlots, schedStartTime, schedEndTime, customBlocks);

        // Fetch blocks to include in response
        const { data: templateBlocks } = await supabase
          .from('setup_template_blocks')
          .select('*')
          .eq('template_id', template.id)
          .order('block_time');

        return res.status(201).json({
          template: {
            ...template,
            schedules: templateSchedules,
            slots: templateSlots,
            blocks: templateBlocks || [],
          },
        });
      }

      if (intent === 'update') {
        const { id, org_id, name, zone, priority, schedules, slots, customBlocks } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (zone !== undefined) updateData.zone = zone;
        if (priority !== undefined) updateData.priority = priority;

        const { data: template, error: templateError } = await supabase
          .from('setup_templates')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (templateError) {
          console.error('Error updating setup template:', templateError);
          return res.status(500).json({ error: 'Failed to update setup template' });
        }

        // Replace schedules if provided
        let templateSchedules: any[] = [];
        if (schedules !== undefined && Array.isArray(schedules)) {
          // Delete existing schedules
          const { error: deleteSchedError } = await supabase
            .from('setup_template_schedules')
            .delete()
            .eq('template_id', id);

          if (deleteSchedError) {
            console.error('Error deleting existing template schedules:', deleteSchedError);
          }

          // Insert new schedules
          if (schedules.length > 0) {
            const { data: schedData, error: schedError } = await supabase
              .from('setup_template_schedules')
              .insert(
                schedules.map((s: any) => ({
                  template_id: id,
                  day_of_week: s.day_of_week,
                  start_time: s.start_time,
                  end_time: s.end_time,
                }))
              )
              .select();

            if (schedError) {
              console.error('Error inserting updated template schedules:', schedError);
            } else {
              templateSchedules = schedData || [];
            }
          }
        }

        // Replace slots if provided
        let templateSlots: any[] = [];
        if (slots !== undefined && Array.isArray(slots)) {
          // Delete existing slots
          const { error: deleteSlotError } = await supabase
            .from('setup_template_slots')
            .delete()
            .eq('template_id', id);

          if (deleteSlotError) {
            console.error('Error deleting existing template slots:', deleteSlotError);
          }

          // Insert new slots
          if (slots.length > 0) {
            const { data: slotData, error: slotError } = await supabase
              .from('setup_template_slots')
              .insert(
                slots.map((s: any) => ({
                  template_id: id,
                  position_id: s.position_id,
                  time_slot: s.time_slot || null,
                  slot_count: s.slot_count ?? 1,
                  is_required: s.is_required ?? false,
                }))
              )
              .select();

            if (slotError) {
              console.error('Error inserting updated template slots:', slotError);
            } else {
              templateSlots = slotData || [];
            }
          }
        }

        // If schedules or slots were not provided, fetch the existing ones
        if (schedules === undefined) {
          const { data: existingSchedules } = await supabase
            .from('setup_template_schedules')
            .select('*')
            .eq('template_id', id);
          templateSchedules = existingSchedules || [];
        }

        if (slots === undefined) {
          const { data: existingSlots } = await supabase
            .from('setup_template_slots')
            .select('*')
            .eq('template_id', id);
          templateSlots = existingSlots || [];
        }

        // Compute and save blocks from the current slots
        const schedStartTime = templateSchedules[0]?.start_time ?? '06:00';
        const schedEndTime = templateSchedules[0]?.end_time ?? '22:00';
        await computeAndSaveBlocks(supabase, id, templateSlots, schedStartTime, schedEndTime, customBlocks);

        // Fetch blocks to include in response
        const { data: templateBlocks } = await supabase
          .from('setup_template_blocks')
          .select('*')
          .eq('template_id', id)
          .order('block_time');

        return res.status(200).json({
          template: {
            ...template,
            schedules: templateSchedules,
            slots: templateSlots,
            blocks: templateBlocks || [],
          },
        });
      }

      if (intent === 'delete') {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

        // Soft delete: set is_active to false
        const { error } = await supabase
          .from('setup_templates')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          console.error('Error deleting setup template:', error);
          return res.status(500).json({ error: 'Failed to delete setup template' });
        }

        return res.status(200).json({ success: true });
      }

      if (intent === 'reorder') {
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
          return res.status(400).json({ error: 'updates array is required' });
        }

        // Update priority for each template
        const errors: any[] = [];
        for (const update of updates) {
          const { id, priority } = update;
          if (!id || priority === undefined) {
            errors.push({ id, error: 'id and priority are required' });
            continue;
          }

          const { error } = await supabase
            .from('setup_templates')
            .update({ priority, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) {
            console.error(`Error updating priority for template ${id}:`, error);
            errors.push({ id, error: error.message });
          }
        }

        if (errors.length > 0) {
          return res.status(207).json({ success: true, errors });
        }

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid intent' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
