/**
 * Schedule tools — schedule overview, employee schedule, and labor summary.
 *
 * Three tools in one file following the multi-function pattern:
 *   - getScheduleOverview: week-level schedule status + coverage
 *   - getEmployeeSchedule: individual employee shifts
 *   - getLaborSummary: labor costs, hours, OT by zone
 */

import { getServiceClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the Monday of the current week (or provided date's week) in YYYY-MM-DD */
function getWeekStart(date?: string): string {
  const d = date ? new Date(date + 'T00:00:00') : new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/** Format time string (HH:MM:SS) to human-readable (e.g. "2:00 PM") */
function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// ─── Schedule Overview ───────────────────────────────────────────────────────

/**
 * Get week-level schedule status + coverage summary.
 * Input: { week_start?: string } — defaults to current week
 */
export async function getScheduleOverview(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const weekStart = getWeekStart(args.week_start as string | undefined);
  const cacheKey = `schedule_overview:${locationId ?? 'org'}:${weekStart}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, () =>
    _getScheduleOverview(orgId, locationId, weekStart)
  );
}

async function _getScheduleOverview(
  orgId: string,
  locationId?: string,
  weekStart?: string
): Promise<string> {
  const supabase = getServiceClient();
  const ws = weekStart ?? getWeekStart();

  // Compute week end (Sunday)
  const weekEnd = new Date(ws + 'T00:00:00');
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weStr = weekEnd.toISOString().split('T')[0];

  // Find the schedule for this week
  const schedBuilder = supabase
    .from('schedules')
    .select('id, week_start, status, published_at, total_labor_cost, total_hours')
    .eq('org_id', orgId)
    .eq('week_start', ws);

  if (locationId) {
    schedBuilder.eq('location_id', locationId);
  }

  const schedResult = await schedBuilder.limit(1).maybeSingle();

  if (schedResult.error) {
    return JSON.stringify({ error: schedResult.error.message });
  }

  if (!schedResult.data) {
    return JSON.stringify({
      week_start: ws,
      message: 'No schedule found for this week',
    });
  }

  const schedule = schedResult.data as any;

  // Fetch shifts for this schedule with assignments
  const shiftsResult = await supabase
    .from('shifts')
    .select(
      'id, shift_date, start_time, end_time, break_minutes, is_house_shift, position_id'
    )
    .eq('schedule_id', schedule.id)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (shiftsResult.error) {
    return JSON.stringify({ error: shiftsResult.error.message });
  }

  const shifts = shiftsResult.data ?? [];

  // Fetch assignments for all shifts
  const shiftIds = shifts.map((s: any) => s.id);
  let assignments: any[] = [];
  if (shiftIds.length > 0) {
    const assResult = await supabase
      .from('shift_assignments')
      .select('shift_id, employee_id, projected_cost')
      .in('shift_id', shiftIds);
    assignments = assResult.data ?? [];
  }

  // Fetch employee names + positions
  const empIds = [...new Set(assignments.map((a: any) => a.employee_id))];
  let empMap = new Map<string, string>();
  if (empIds.length > 0) {
    const empResult = await supabase
      .from('employees')
      .select('id, full_name')
      .in('id', empIds);
    for (const e of empResult.data ?? []) {
      empMap.set(e.id, (e as any).full_name);
    }
  }

  // Fetch position names
  const posIds = [
    ...new Set(shifts.filter((s: any) => s.position_id).map((s: any) => s.position_id)),
  ];
  let posMap = new Map<string, string>();
  if (posIds.length > 0) {
    const posResult = await supabase
      .from('org_positions')
      .select('id, name')
      .in('id', posIds);
    for (const p of posResult.data ?? []) {
      posMap.set(p.id, (p as any).name);
    }
  }

  // Build assignment lookup: shiftId → employee names
  const shiftAssignments = new Map<string, string[]>();
  for (const a of assignments) {
    const sId = a.shift_id;
    if (!shiftAssignments.has(sId)) shiftAssignments.set(sId, []);
    const name = empMap.get(a.employee_id) ?? 'Unknown';
    shiftAssignments.get(sId)!.push(name);
  }

  // Group shifts by day for coverage summary
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dailyCoverage: Record<
    string,
    { date: string; shift_count: number; assigned: number; unassigned: number; hours: number }
  > = {};

  for (const shift of shifts) {
    const date = (shift as any).shift_date;
    if (!dailyCoverage[date]) {
      const d = new Date(date + 'T00:00:00');
      const dayIndex = (d.getDay() + 6) % 7; // Mon=0
      dailyCoverage[date] = {
        date: `${dayNames[dayIndex]} ${date}`,
        shift_count: 0,
        assigned: 0,
        unassigned: 0,
        hours: 0,
      };
    }

    const dc = dailyCoverage[date];
    dc.shift_count += 1;

    const assignedTo = shiftAssignments.get((shift as any).id) ?? [];
    if (assignedTo.length > 0) {
      dc.assigned += 1;
    } else {
      dc.unassigned += 1;
    }

    // Calculate hours
    const start = (shift as any).start_time as string;
    const end = (shift as any).end_time as string;
    const breakMin = (shift as any).break_minutes ?? 0;
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let hours = (eh * 60 + em - (sh * 60 + sm) - breakMin) / 60;
      if (hours < 0) hours += 24; // overnight shift
      dc.hours += hours;
    }
  }

  const totalShifts = shifts.length;
  const totalAssigned = assignments.length;
  const totalUnassigned = totalShifts - new Set(assignments.map((a: any) => a.shift_id)).size;

  return JSON.stringify({
    week_start: ws,
    week_end: weStr,
    status: schedule.status,
    published_at: schedule.published_at,
    total_shifts: totalShifts,
    total_assigned: totalAssigned,
    total_unassigned: totalUnassigned,
    total_hours: schedule.total_hours
      ? Math.round(schedule.total_hours * 10) / 10
      : Math.round(Object.values(dailyCoverage).reduce((s, d) => s + d.hours, 0) * 10) / 10,
    total_labor_cost: schedule.total_labor_cost
      ? Math.round(schedule.total_labor_cost * 100) / 100
      : null,
    daily_coverage: Object.values(dailyCoverage),
  });
}

// ─── Employee Schedule ───────────────────────────────────────────────────────

/**
 * Get individual employee shifts for upcoming weeks.
 * Input: { employee_id: string, weeks?: number } — defaults to 2 weeks
 */
export async function getEmployeeSchedule(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const employeeId = args.employee_id as string;
  const weeks = (args.weeks as number) ?? 2;
  if (!employeeId) {
    return JSON.stringify({ error: 'employee_id is required' });
  }

  const cacheKey = `emp_schedule:${employeeId}:${weeks}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, () =>
    _getEmployeeSchedule(orgId, employeeId, weeks)
  );
}

async function _getEmployeeSchedule(
  orgId: string,
  employeeId: string,
  weeks: number
): Promise<string> {
  const supabase = getServiceClient();

  // Date range: today → N weeks out
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeks * 7);
  const endStr = endDate.toISOString().split('T')[0];

  // Get employee name
  const empResult = await supabase
    .from('employees')
    .select('id, full_name, role')
    .eq('id', employeeId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!empResult.data) {
    return JSON.stringify({ error: 'Employee not found' });
  }

  const emp = empResult.data as any;

  // Get shift assignments for this employee
  const assignResult = await supabase
    .from('shift_assignments')
    .select('shift_id, projected_cost')
    .eq('employee_id', employeeId)
    .eq('org_id', orgId);

  if (assignResult.error) {
    return JSON.stringify({ error: assignResult.error.message });
  }

  const assignments = assignResult.data ?? [];
  if (assignments.length === 0) {
    return JSON.stringify({
      employee: emp.full_name,
      role: emp.role,
      message: 'No shifts scheduled',
    });
  }

  const shiftIds = assignments.map((a: any) => a.shift_id);

  // Get the actual shift details, filtered by date range
  const shiftsResult = await supabase
    .from('shifts')
    .select('id, shift_date, start_time, end_time, break_minutes, position_id, is_house_shift')
    .in('id', shiftIds)
    .gte('shift_date', today)
    .lte('shift_date', endStr)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true });

  const shifts = shiftsResult.data ?? [];

  if (shifts.length === 0) {
    return JSON.stringify({
      employee: emp.full_name,
      role: emp.role,
      message: `No shifts scheduled between ${today} and ${endStr}`,
    });
  }

  // Get position names
  const posIds = [
    ...new Set(shifts.filter((s: any) => s.position_id).map((s: any) => s.position_id)),
  ];
  let posMap = new Map<string, string>();
  if (posIds.length > 0) {
    const posResult = await supabase
      .from('org_positions')
      .select('id, name')
      .in('id', posIds);
    for (const p of posResult.data ?? []) {
      posMap.set(p.id, (p as any).name);
    }
  }

  // Format shifts
  const formattedShifts = shifts.map((s: any) => {
    const start = s.start_time as string;
    const end = s.end_time as string;
    const breakMin = s.break_minutes ?? 0;

    // Compute hours
    let hours = 0;
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      hours = (eh * 60 + em - (sh * 60 + sm) - breakMin) / 60;
      if (hours < 0) hours += 24;
    }

    const result: Record<string, unknown> = {
      date: s.shift_date,
      start: formatTime(start),
      end: formatTime(end),
      hours: Math.round(hours * 10) / 10,
    };

    if (s.position_id && posMap.has(s.position_id)) {
      result.position = posMap.get(s.position_id);
    }
    if (breakMin > 0) result.break_minutes = breakMin;
    if (s.is_house_shift) result.is_house_shift = true;

    return result;
  });

  // Total hours
  const totalHours = formattedShifts.reduce(
    (sum: number, s: any) => sum + (s.hours ?? 0),
    0
  );

  return JSON.stringify({
    employee: emp.full_name,
    role: emp.role,
    date_range: { start: today, end: endStr },
    total_shifts: formattedShifts.length,
    total_hours: Math.round(totalHours * 10) / 10,
    shifts: formattedShifts,
  });
}

// ─── Labor Summary ───────────────────────────────────────────────────────────

/**
 * Get labor cost summary by zone with OT breakdown.
 * Input: { week_start?: string, zone?: 'FOH' | 'BOH' }
 */
export async function getLaborSummary(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const weekStart = getWeekStart(args.week_start as string | undefined);
  const zone = args.zone as string | undefined;
  const cacheKey = `labor:${locationId ?? 'org'}:${weekStart}:${zone ?? 'all'}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, () =>
    _getLaborSummary(orgId, locationId, weekStart, zone)
  );
}

async function _getLaborSummary(
  orgId: string,
  locationId?: string,
  weekStart?: string,
  zone?: string
): Promise<string> {
  const supabase = getServiceClient();
  const ws = weekStart ?? getWeekStart();

  // Find schedule
  const schedBuilder = supabase
    .from('schedules')
    .select('id, week_start, status, total_labor_cost, total_hours')
    .eq('org_id', orgId)
    .eq('week_start', ws);

  if (locationId) {
    schedBuilder.eq('location_id', locationId);
  }

  const schedResult = await schedBuilder.limit(1).maybeSingle();

  if (!schedResult.data) {
    return JSON.stringify({
      week_start: ws,
      message: 'No schedule found for this week',
    });
  }

  const schedule = schedResult.data as any;

  // Fetch shifts + assignments + employee details in parallel
  const [shiftsResult, empResult] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, shift_date, start_time, end_time, break_minutes, position_id')
      .eq('schedule_id', schedule.id)
      .order('shift_date', { ascending: true }),
    (() => {
      let q = supabase
        .from('employees')
        .select('id, full_name, role, is_foh, is_boh, calculated_pay, actual_pay')
        .eq('org_id', orgId)
        .eq('active', true);
      if (locationId) q = q.eq('location_id', locationId);
      if (zone?.toUpperCase() === 'FOH') q = q.eq('is_foh', true);
      else if (zone?.toUpperCase() === 'BOH') q = q.eq('is_boh', true);
      return q;
    })(),
  ]);

  const shifts = shiftsResult.data ?? [];
  const employees = empResult.data ?? [];

  const empById = new Map<string, any>();
  for (const e of employees) {
    empById.set(e.id, e);
  }

  // Get assignments
  const shiftIds = shifts.map((s: any) => s.id);
  let assignments: any[] = [];
  if (shiftIds.length > 0) {
    const assResult = await supabase
      .from('shift_assignments')
      .select('shift_id, employee_id, projected_cost')
      .in('shift_id', shiftIds);
    assignments = assResult.data ?? [];
  }

  // Get position names
  const posIds = [
    ...new Set(shifts.filter((s: any) => s.position_id).map((s: any) => s.position_id)),
  ];
  let posMap = new Map<string, string>();
  if (posIds.length > 0) {
    const posResult = await supabase
      .from('org_positions')
      .select('id, name')
      .in('id', posIds);
    for (const p of posResult.data ?? []) {
      posMap.set(p.id, (p as any).name);
    }
  }

  // Build shift lookup
  const shiftById = new Map<string, any>();
  for (const s of shifts) {
    shiftById.set((s as any).id, s);
  }

  // Calculate hours per employee, per day
  const empHoursByDay = new Map<string, Map<string, number>>(); // empId → (date → hours)
  let totalHours = 0;
  let totalCost = 0;

  // Zone breakdown
  const zoneHours: Record<string, number> = { FOH: 0, BOH: 0, Other: 0 };
  const zoneCost: Record<string, number> = { FOH: 0, BOH: 0, Other: 0 };

  for (const a of assignments) {
    const shift = shiftById.get(a.shift_id);
    if (!shift) continue;

    const emp = empById.get(a.employee_id);
    if (!emp) continue;

    // Calculate shift hours
    const start = shift.start_time as string;
    const end = shift.end_time as string;
    const breakMin = shift.break_minutes ?? 0;

    let hours = 0;
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      hours = (eh * 60 + em - (sh * 60 + sm) - breakMin) / 60;
      if (hours < 0) hours += 24;
    }

    totalHours += hours;

    // Accumulate per-employee per-day
    if (!empHoursByDay.has(a.employee_id)) {
      empHoursByDay.set(a.employee_id, new Map());
    }
    const dayMap = empHoursByDay.get(a.employee_id)!;
    dayMap.set(shift.shift_date, (dayMap.get(shift.shift_date) || 0) + hours);

    // Calculate cost
    const payRate = emp.actual_pay ?? emp.calculated_pay ?? 0;
    const shiftCost = a.projected_cost ?? hours * payRate;
    totalCost += shiftCost;

    // Zone breakdown
    const empZone = emp.is_foh ? 'FOH' : emp.is_boh ? 'BOH' : 'Other';
    zoneHours[empZone] += hours;
    zoneCost[empZone] += shiftCost;
  }

  // Calculate weekly hours per employee for OT detection
  const weeklyHours = new Map<string, number>();
  for (const [empId, dayMap] of empHoursByDay) {
    let total = 0;
    for (const h of dayMap.values()) total += h;
    weeklyHours.set(empId, total);
  }

  // Flag potential OT (>40 hours/week)
  const overtimeEmployees: Array<{
    name: string;
    role: string;
    weekly_hours: number;
  }> = [];

  for (const [empId, hours] of weeklyHours) {
    if (hours > 40) {
      const emp = empById.get(empId);
      if (emp) {
        overtimeEmployees.push({
          name: emp.full_name,
          role: emp.role,
          weekly_hours: Math.round(hours * 10) / 10,
        });
      }
    }
  }

  overtimeEmployees.sort((a, b) => b.weekly_hours - a.weekly_hours);

  return JSON.stringify({
    week_start: ws,
    schedule_status: schedule.status,
    zone_filter: zone || 'all',
    total_hours: Math.round(totalHours * 10) / 10,
    total_labor_cost: Math.round(totalCost * 100) / 100,
    employees_scheduled: empHoursByDay.size,
    by_zone: {
      FOH: {
        hours: Math.round(zoneHours.FOH * 10) / 10,
        cost: Math.round(zoneCost.FOH * 100) / 100,
      },
      BOH: {
        hours: Math.round(zoneHours.BOH * 10) / 10,
        cost: Math.round(zoneCost.BOH * 100) / 100,
      },
    },
    overtime_alerts:
      overtimeEmployees.length > 0
        ? overtimeEmployees
        : 'No employees exceeding 40 hours',
  });
}
