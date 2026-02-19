import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Convert JS Date.getDay() (0=Sun..6=Sat) to DB day_of_week (0=Mon..6=Sun).
 */
function jsDayToDbDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Format a number of minutes since midnight as "HH:MM".
 */
function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Parse a "HH:MM" or "HH:MM:SS" time string to total minutes since midnight.
 */
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

interface Template {
  id: string;
  org_id: string;
  name: string;
  zone: string;
  priority: number;
  is_active: boolean;
  setup_template_schedules: TemplateSchedule[];
  setup_template_slots: TemplateSlot[];
}

interface ResolvedPosition {
  slot_count: number;
  is_required: boolean;
}

interface ResolvedSlot {
  template_id: string;
  template_name: string;
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

    const { org_id, date } = req.query;

    if (!org_id || typeof org_id !== 'string') {
      return res.status(400).json({ error: 'org_id is required' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    }

    // Validate date format
    const parsedDate = new Date(date + 'T00:00:00');
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const jsDay = parsedDate.getDay();
    const dbDay = jsDayToDbDay(jsDay);

    // Fetch all active templates for this org with their schedules and slots
    const { data: templates, error } = await supabase
      .from('setup_templates')
      .select(`
        id, org_id, name, zone, priority, is_active,
        setup_template_schedules(*),
        setup_template_slots(*)
      `)
      .eq('org_id', org_id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching setup templates:', error);
      return res.status(500).json({ error: 'Failed to fetch setup templates' });
    }

    if (!templates || templates.length === 0) {
      return res.status(200).json({ resolved_slots: {} });
    }

    const typedTemplates = templates as unknown as Template[];

    // Pre-filter: for each template, find schedules that include this day of week
    const templateDaySchedules = new Map<string, TemplateSchedule[]>();
    for (const template of typedTemplates) {
      const matchingSchedules = (template.setup_template_schedules || []).filter(
        (sched) => sched.day_of_week.includes(dbDay)
      );
      if (matchingSchedules.length > 0) {
        templateDaySchedules.set(template.id, matchingSchedules);
      }
    }

    // Build a lookup from template_id -> its slots grouped by time_slot
    const templateSlotMap = new Map<string, Map<string, TemplateSlot[]>>();
    for (const template of typedTemplates) {
      const byTime = new Map<string, TemplateSlot[]>();
      for (const slot of template.setup_template_slots || []) {
        // Normalize time_slot to HH:MM
        const normalizedTime = minutesToTimeStr(timeStrToMinutes(slot.time_slot));
        const existing = byTime.get(normalizedTime) || [];
        existing.push(slot);
        byTime.set(normalizedTime, existing);
      }
      templateSlotMap.set(template.id, byTime);
    }

    // Build a quick lookup for template by id
    const templateById = new Map<string, Template>();
    for (const template of typedTemplates) {
      templateById.set(template.id, template);
    }

    // Iterate over every 30-minute slot in the day (00:00 to 23:30)
    const resolvedSlots: Record<string, ResolvedSlot> = {};

    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const timeStr = minutesToTimeStr(minutes);

      // Find the highest-priority template active at this time slot on this day
      let winningTemplate: Template | null = null;
      let winningPriority = -Infinity;

      for (const template of typedTemplates) {
        const schedules = templateDaySchedules.get(template.id);
        if (!schedules) continue;

        // Check if any of this template's schedules cover this time slot
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

      if (!winningTemplate) continue;

      // Get this template's slots for the current time
      const slotsByTime = templateSlotMap.get(winningTemplate.id);
      const slotsAtTime = slotsByTime?.get(timeStr);

      if (!slotsAtTime || slotsAtTime.length === 0) continue;

      const positions: Record<string, ResolvedPosition> = {};
      for (const slot of slotsAtTime) {
        positions[slot.position_id] = {
          slot_count: slot.slot_count,
          is_required: slot.is_required,
        };
      }

      resolvedSlots[timeStr] = {
        template_id: winningTemplate.id,
        template_name: winningTemplate.name,
        positions,
      };
    }

    return res.status(200).json({ resolved_slots: resolvedSlots });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
