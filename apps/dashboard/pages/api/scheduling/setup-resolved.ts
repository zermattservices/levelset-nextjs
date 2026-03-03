import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStrToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

interface TemplateSchedule {
  id: string;
  template_id: string;
  day_of_week: number[];
  start_time: string;
  end_time: string;
}

interface TemplateSlot {
  id: string;
  template_id: string;
  position_id: string;
  time_slot: string;
  slot_count: number;
  is_required: boolean;
}

interface TemplateBlock {
  id: string;
  template_id: string;
  block_time: string;
  is_custom: boolean;
}

interface Template {
  id: string;
  org_id: string;
  name: string;
  zone: string;
  priority: number;
  is_active: boolean;
  setup_template_schedules: TemplateSchedule[];
  setup_template_slots: TemplateSlot[];
  setup_template_blocks: TemplateBlock[];
}

interface ResolvedPosition {
  slot_count: number;
  is_required: boolean;
}

interface ResolvedBlock {
  block_time: string;
  end_time: string;
  template_id: string;
  template_name: string;
  zone: string;
  positions: Record<string, ResolvedPosition>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { org_id, date, zone } = req.query;

    if (!org_id || typeof org_id !== 'string') {
      return res.status(400).json({ error: 'org_id is required' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    }

    if (!zone || typeof zone !== 'string' || !['FOH', 'BOH'].includes(zone)) {
      return res.status(400).json({ error: 'zone is required (FOH or BOH)' });
    }

    const parsedDate = new Date(date + 'T00:00:00');
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // day_of_week in DB uses same convention as JS: 0=Sun, 1=Mon...6=Sat
    const dayOfWeek = parsedDate.getDay();

    // Fetch active templates for this org + zone with schedules, slots, and blocks
    const { data: templates, error } = await supabase
      .from('setup_templates')
      .select(`
        id, org_id, name, zone, priority, is_active,
        setup_template_schedules(*),
        setup_template_slots(*),
        setup_template_blocks(*)
      `)
      .eq('org_id', org_id)
      .eq('zone', zone)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching setup templates:', error);
      return res.status(500).json({ error: 'Failed to fetch setup templates' });
    }

    if (!templates || templates.length === 0) {
      return res.status(200).json({ blocks: [] });
    }

    const typedTemplates = templates as unknown as Template[];

    // Pre-filter: for each template, find schedules that include this day
    const templateDaySchedules = new Map<string, TemplateSchedule[]>();
    for (const template of typedTemplates) {
      const matchingSchedules = (template.setup_template_schedules || []).filter(
        (sched) => sched.day_of_week.includes(dayOfWeek)
      );
      if (matchingSchedules.length > 0) {
        templateDaySchedules.set(template.id, matchingSchedules);
      }
    }

    // Build slot lookup: template_id -> time -> position slots
    const templateSlotMap = new Map<string, Map<string, TemplateSlot[]>>();
    for (const template of typedTemplates) {
      const byTime = new Map<string, TemplateSlot[]>();
      for (const slot of template.setup_template_slots || []) {
        const normalizedTime = minutesToTimeStr(timeStrToMinutes(slot.time_slot));
        const existing = byTime.get(normalizedTime) || [];
        existing.push(slot);
        byTime.set(normalizedTime, existing);
      }
      templateSlotMap.set(template.id, byTime);
    }

    // For each 30-min slot, determine the winning template (highest priority)
    // Then collect which templates own which time ranges
    const timeToTemplate = new Map<number, Template>();

    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      let winningTemplate: Template | null = null;
      let winningPriority = -Infinity;

      for (const template of typedTemplates) {
        const schedules = templateDaySchedules.get(template.id);
        if (!schedules) continue;

        const covers = schedules.some((sched) => {
          const schedStart = timeStrToMinutes(sched.start_time);
          const schedEnd = timeStrToMinutes(sched.end_time);
          return minutes >= schedStart && minutes < schedEnd;
        });

        if (covers && template.priority > winningPriority) {
          winningPriority = template.priority;
          winningTemplate = template;
        }
      }

      if (winningTemplate) {
        timeToTemplate.set(minutes, winningTemplate);
      }
    }

    // Collect all blocks from winning templates, scoped to their active time ranges
    const resolvedBlocks: ResolvedBlock[] = [];

    // Group consecutive time slots by template to find active ranges
    const templateRanges = new Map<string, { start: number; end: number }[]>();
    let currentTemplateId: string | null = null;
    let rangeStart = 0;

    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const template = timeToTemplate.get(minutes);
      const tId = template?.id ?? null;

      if (tId !== currentTemplateId) {
        if (currentTemplateId) {
          const ranges = templateRanges.get(currentTemplateId) || [];
          ranges.push({ start: rangeStart, end: minutes });
          templateRanges.set(currentTemplateId, ranges);
        }
        currentTemplateId = tId;
        rangeStart = minutes;
      }
    }
    // Close the final range
    if (currentTemplateId) {
      const ranges = templateRanges.get(currentTemplateId) || [];
      // Find actual end from schedule
      const lastMin = 24 * 60;
      ranges.push({ start: rangeStart, end: lastMin });
      templateRanges.set(currentTemplateId, ranges);
    }

    // For each template with active ranges, get its blocks within those ranges
    for (const template of typedTemplates) {
      const ranges = templateRanges.get(template.id);
      if (!ranges) continue;

      const blocks = (template.setup_template_blocks || [])
        .map(b => ({
          ...b,
          block_time: minutesToTimeStr(timeStrToMinutes(b.block_time)),
        }))
        .sort((a, b) => timeStrToMinutes(a.block_time) - timeStrToMinutes(b.block_time));

      const slotsByTime = templateSlotMap.get(template.id);

      for (const range of ranges) {
        // Filter blocks within this range
        const rangeBlocks = blocks.filter(b => {
          const bMin = timeStrToMinutes(b.block_time);
          return bMin >= range.start && bMin < range.end;
        });

        // If no blocks exist for this range, create one at range start
        if (rangeBlocks.length === 0) {
          rangeBlocks.push({
            id: '',
            template_id: template.id,
            block_time: minutesToTimeStr(range.start),
            is_custom: false,
          });
        }

        for (let i = 0; i < rangeBlocks.length; i++) {
          const block = rangeBlocks[i];
          const blockMin = timeStrToMinutes(block.block_time);

          // End time = next block start or range end
          const nextBlockMin = i + 1 < rangeBlocks.length
            ? timeStrToMinutes(rangeBlocks[i + 1].block_time)
            : range.end;

          // Get positions for this block's time from the slot grid
          const positions: Record<string, ResolvedPosition> = {};
          const slotsAtTime = slotsByTime?.get(block.block_time);
          if (slotsAtTime) {
            for (const slot of slotsAtTime) {
              positions[slot.position_id] = {
                slot_count: slot.slot_count,
                is_required: slot.is_required,
              };
            }
          }

          resolvedBlocks.push({
            block_time: block.block_time,
            end_time: minutesToTimeStr(Math.min(nextBlockMin, range.end)),
            template_id: template.id,
            template_name: template.name,
            zone: template.zone,
            positions,
          });
        }
      }
    }

    // Sort blocks by time
    resolvedBlocks.sort((a, b) => timeStrToMinutes(a.block_time) - timeStrToMinutes(b.block_time));

    return res.status(200).json({ blocks: resolvedBlocks });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
