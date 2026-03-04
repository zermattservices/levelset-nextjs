/**
 * Native Form API: Setup Board
 * GET  /api/native/forms/setup-board?location_id=<id>&date=YYYY-MM-DD&zone=FOH|BOH
 * POST /api/native/forms/setup-board  (intent: assign | unassign | reassign)
 *
 * Consolidates the dashboard's setup-resolved + setup-assignments APIs
 * into a single mobile-optimized endpoint.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

// ---------------------------------------------------------------------------
// Time utilities (from setup-resolved.ts)
// ---------------------------------------------------------------------------

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStrToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function deriveBlocksFromSlots(
  slots: { position_id: string; time_slot: string; slot_count: number }[],
  scheduleStartMin: number,
  scheduleEndMin: number,
): string[] {
  const slotsByTime = new Map<string, Map<string, number>>();
  for (const s of slots) {
    const normalizedTime = minutesToTimeStr(timeStrToMinutes(s.time_slot));
    if (!slotsByTime.has(normalizedTime)) slotsByTime.set(normalizedTime, new Map());
    slotsByTime.get(normalizedTime)!.set(s.position_id, s.slot_count);
  }
  const derivedBlocks: string[] = [];
  let prevSnapshot: string | null = null;
  for (let min = scheduleStartMin; min < scheduleEndMin; min += 30) {
    const timeStr = minutesToTimeStr(min);
    const posMap = slotsByTime.get(timeStr);
    const snapshot = posMap
      ? Array.from(posMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`).join('|')
      : '';
    if (min === scheduleStartMin) {
      derivedBlocks.push(timeStr);
    } else if (snapshot !== prevSnapshot) {
      derivedBlocks.push(timeStr);
    }
    prevSnapshot = snapshot;
  }
  return derivedBlocks;
}

function resolveAssignmentWindow(
  requestedStartTime: string,
  requestedEndTime: string,
  shiftStartTime: string,
  shiftEndTime: string,
): { startTime: string; endTime: string } | null {
  const start = Math.max(timeStrToMinutes(requestedStartTime), timeStrToMinutes(shiftStartTime));
  const end = Math.min(timeStrToMinutes(requestedEndTime), timeStrToMinutes(shiftEndTime));
  if (end <= start) return null;
  return { startTime: minutesToTimeStr(start), endTime: minutesToTimeStr(end) };
}

// ---------------------------------------------------------------------------
// Assignment SELECT (from setup-assignments.ts, trimmed for mobile)
// ---------------------------------------------------------------------------

const ASSIGNMENT_SELECT = `
  *,
  employee:employees(id, full_name),
  position:org_positions(id, name, zone),
  shift:shifts(id, shift_date, start_time, end_time, position_id)
`;

// ---------------------------------------------------------------------------
// Types for block resolution
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();

  const locationId = (req.query.location_id || req.body?.location_id) as string;
  if (!locationId) return res.status(400).json({ error: 'Missing location_id' });

  const location = await validateLocationAccess(context.userId, context.orgId, locationId);
  if (!location) return res.status(403).json({ error: 'Access denied for this location' });

  const orgId = location.org_id;

  // ── GET: Fetch all setup data for a date + zone ──────────────────────────
  if (req.method === 'GET') {
    const { date, zone } = req.query;
    if (!date || typeof date !== 'string') return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    if (!zone || !['FOH', 'BOH'].includes(zone as string)) return res.status(400).json({ error: 'zone required (FOH or BOH)' });

    const parsedDate = new Date(date + 'T00:00:00');
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'Invalid date' });
    const dayOfWeek = parsedDate.getDay();

    // 1. Resolve blocks (same algorithm as setup-resolved.ts) ──────────────
    const { data: templates, error: tplError } = await supabase
      .from('setup_templates')
      .select(`
        id, org_id, name, zone, priority, is_active,
        setup_template_schedules(*),
        setup_template_slots(*),
        setup_template_blocks(*)
      `)
      .eq('org_id', orgId)
      .eq('zone', zone as string)
      .eq('is_active', true);

    if (tplError) {
      console.error('[setup-board] Failed to fetch templates:', tplError);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    const resolvedBlocks: ResolvedBlock[] = [];

    if (templates && templates.length > 0) {
      const typedTemplates = templates as unknown as Template[];

      // Pre-filter schedules for this day
      const templateDaySchedules = new Map<string, TemplateSchedule[]>();
      for (const t of typedTemplates) {
        const matching = (t.setup_template_schedules || []).filter(
          (s) => s.day_of_week.includes(dayOfWeek)
        );
        if (matching.length > 0) templateDaySchedules.set(t.id, matching);
      }

      // Build slot lookup: template_id -> time -> position slots
      const templateSlotMap = new Map<string, Map<string, TemplateSlot[]>>();
      for (const t of typedTemplates) {
        const byTime = new Map<string, TemplateSlot[]>();
        for (const slot of t.setup_template_slots || []) {
          const nt = minutesToTimeStr(timeStrToMinutes(slot.time_slot));
          const existing = byTime.get(nt) || [];
          existing.push(slot);
          byTime.set(nt, existing);
        }
        templateSlotMap.set(t.id, byTime);
      }

      // For each 30-min slot, determine the winning template (highest priority)
      const timeToTemplate = new Map<number, Template>();
      for (let min = 0; min < 24 * 60; min += 30) {
        let winner: Template | null = null;
        let bestPri = -Infinity;
        for (const t of typedTemplates) {
          const scheds = templateDaySchedules.get(t.id);
          if (!scheds) continue;
          if (scheds.some((s) => min >= timeStrToMinutes(s.start_time) && min < timeStrToMinutes(s.end_time))) {
            if (t.priority > bestPri) { bestPri = t.priority; winner = t; }
          }
        }
        if (winner) timeToTemplate.set(min, winner);
      }

      // Group consecutive slots by template to find active ranges
      const templateRanges = new Map<string, { start: number; end: number }[]>();
      let curId: string | null = null;
      let rangeStart = 0;
      for (let min = 0; min < 24 * 60; min += 30) {
        const tId = timeToTemplate.get(min)?.id ?? null;
        if (tId !== curId) {
          if (curId) {
            const r = templateRanges.get(curId) || [];
            r.push({ start: rangeStart, end: min });
            templateRanges.set(curId, r);
          }
          curId = tId;
          rangeStart = min;
        }
      }
      if (curId) {
        const r = templateRanges.get(curId) || [];
        r.push({ start: rangeStart, end: 24 * 60 });
        templateRanges.set(curId, r);
      }

      // For each template with active ranges, get its blocks within those ranges
      for (const t of typedTemplates) {
        const ranges = templateRanges.get(t.id);
        if (!ranges) continue;

        let dbBlocks = t.setup_template_blocks || [];
        if (dbBlocks.length === 0) {
          const scheds = templateDaySchedules.get(t.id) || [];
          if (scheds.length > 0) {
            const derived = deriveBlocksFromSlots(
              t.setup_template_slots || [],
              timeStrToMinutes(scheds[0].start_time),
              timeStrToMinutes(scheds[0].end_time),
            );
            dbBlocks = derived.map((bt) => ({
              id: '',
              template_id: t.id,
              block_time: bt,
              is_custom: false,
            }));
          }
        }

        const blocks = dbBlocks
          .map((b) => ({ ...b, block_time: minutesToTimeStr(timeStrToMinutes(b.block_time)) }))
          .sort((a, b) => timeStrToMinutes(a.block_time) - timeStrToMinutes(b.block_time));

        const slotsByTime = templateSlotMap.get(t.id);

        for (const range of ranges) {
          let rangeBlocks = blocks.filter((b) => {
            const bm = timeStrToMinutes(b.block_time);
            return bm >= range.start && bm < range.end;
          });
          if (rangeBlocks.length === 0) {
            rangeBlocks = [{
              id: '',
              template_id: t.id,
              block_time: minutesToTimeStr(range.start),
              is_custom: false,
            }];
          }

          for (let i = 0; i < rangeBlocks.length; i++) {
            const block = rangeBlocks[i];
            const nextMin = i + 1 < rangeBlocks.length
              ? timeStrToMinutes(rangeBlocks[i + 1].block_time)
              : range.end;

            const positions: Record<string, ResolvedPosition> = {};
            const slotsAtTime = slotsByTime?.get(block.block_time);
            if (slotsAtTime) {
              for (const s of slotsAtTime) {
                positions[s.position_id] = { slot_count: s.slot_count, is_required: s.is_required };
              }
            }

            resolvedBlocks.push({
              block_time: block.block_time,
              end_time: minutesToTimeStr(Math.min(nextMin, range.end)),
              template_id: t.id,
              template_name: t.name,
              zone: t.zone,
              positions,
            });
          }
        }
      }
      resolvedBlocks.sort((a, b) => timeStrToMinutes(a.block_time) - timeStrToMinutes(b.block_time));
    }

    // 2. Positions (ordered by display_order, filtered by zone) ─────────────
    const { data: positionsData } = await supabase
      .from('org_positions')
      .select('id, name, name_es, zone, display_order')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .eq('position_type', 'standard')
      .not('scheduling_enabled', 'eq', false)
      .order('display_order', { ascending: true });

    const positions = (positionsData || [])
      .filter((p: any) => p.zone === zone)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        name_es: p.name_es,
        zone: p.zone,
        display_order: p.display_order,
      }));

    // 3. Employees with shifts on this date ─────────────────────────────────
    // First find relevant schedule IDs for this location
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('location_id', locationId);

    const scheduleIds = (schedules || []).map((s: any) => s.id);
    let shifts: any[] = [];

    if (scheduleIds.length > 0) {
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select(`
          id, shift_date, start_time, end_time, position_id, is_house_shift, break_minutes,
          assignment:shift_assignments(employee_id, employee:employees(id, full_name, is_foh, is_boh, role))
        `)
        .eq('shift_date', date)
        .in('schedule_id', scheduleIds);
      shifts = shiftsData || [];
    }

    // Build employee list from shifts (zone-filtered)
    const employeeMap = new Map<string, any>();
    for (const shift of shifts) {
      if (shift.is_house_shift) continue;
      const assignments = Array.isArray(shift.assignment) ? shift.assignment : [shift.assignment].filter(Boolean);
      for (const assignment of assignments) {
        if (!assignment?.employee_id) continue;
        const emp = assignment.employee;
        if (!emp) continue;
        const zoneMatch = zone === 'FOH' ? emp.is_foh : emp.is_boh;
        if (!zoneMatch) continue;
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            id: emp.id,
            full_name: emp.full_name,
            is_foh: emp.is_foh,
            is_boh: emp.is_boh,
            shift: {
              id: shift.id,
              start_time: shift.start_time,
              end_time: shift.end_time,
              position_id: shift.position_id,
            },
          });
        }
      }
    }
    const employees = Array.from(employeeMap.values());

    // 4. Existing assignments for this date ─────────────────────────────────
    const { data: assignmentsData } = await supabase
      .from('setup_assignments')
      .select(ASSIGNMENT_SELECT)
      .eq('org_id', orgId)
      .eq('assignment_date', date);

    return res.status(200).json({
      blocks: resolvedBlocks,
      positions,
      employees,
      assignments: assignmentsData || [],
    });
  }

  // ── POST: Assignment CRUD ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { intent } = req.body;

    if (intent === 'assign') {
      const { shift_id, employee_id, position_id, assignment_date, start_time, end_time } = req.body;
      if (!shift_id || !employee_id || !position_id || !assignment_date || !start_time || !end_time) {
        return res.status(400).json({
          error: 'shift_id, employee_id, position_id, assignment_date, start_time, end_time required',
        });
      }

      // Verify shift
      const { data: shift } = await supabase
        .from('shifts')
        .select('id, org_id, shift_date, start_time, end_time')
        .eq('id', shift_id)
        .eq('org_id', orgId)
        .single();
      if (!shift) return res.status(404).json({ error: 'Shift not found' });
      if (shift.shift_date !== assignment_date) return res.status(400).json({ error: 'Date mismatch' });

      const window = resolveAssignmentWindow(start_time, end_time, shift.start_time, shift.end_time);
      if (!window) return res.status(409).json({ error: 'Block does not overlap shift' });

      // One-position-per-block validation
      const { data: existing } = await supabase
        .from('setup_assignments')
        .select('id, position_id, start_time, end_time')
        .eq('employee_id', employee_id)
        .eq('assignment_date', assignment_date)
        .lt('start_time', window.endTime)
        .gt('end_time', window.startTime);

      if ((existing || []).find((a: any) => a.position_id !== position_id)) {
        return res.status(409).json({ error: 'Employee already assigned to another position in this block' });
      }

      const { data, error } = await supabase
        .from('setup_assignments')
        .insert({
          org_id: orgId,
          shift_id,
          employee_id,
          position_id,
          assignment_date,
          start_time: window.startTime,
          end_time: window.endTime,
          assigned_by: context.userId,
        })
        .select(ASSIGNMENT_SELECT)
        .single();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Assignment already exists' });
        console.error('[setup-board] Assign error:', error);
        return res.status(500).json({ error: 'Failed to assign' });
      }
      return res.status(201).json({ assignment: data });
    }

    if (intent === 'unassign') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('setup_assignments').delete().eq('id', id);
      if (error) {
        console.error('[setup-board] Unassign error:', error);
        return res.status(500).json({ error: 'Failed to unassign' });
      }
      return res.status(200).json({ success: true });
    }

    if (intent === 'reassign') {
      const { id, position_id } = req.body;
      if (!id || !position_id) return res.status(400).json({ error: 'id and position_id required' });
      const { data, error } = await supabase
        .from('setup_assignments')
        .update({ position_id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(ASSIGNMENT_SELECT)
        .single();
      if (error) {
        console.error('[setup-board] Reassign error:', error);
        return res.status(500).json({ error: 'Failed to reassign' });
      }
      return res.status(200).json({ assignment: data });
    }

    return res.status(400).json({ error: 'Invalid intent' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.SCHED_VIEW, handler);
