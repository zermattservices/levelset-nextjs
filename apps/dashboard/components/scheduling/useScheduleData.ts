import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import type {
  Schedule, Shift, Position,
  GridViewMode, TimeViewMode, ZoneFilter, LaborSummary,
  SalesForecast,
} from '@/lib/scheduling.types';
import {
  calculateWeeklyOvertime,
  DEFAULT_OT_RULES,
  type OvertimeRule,
  type ShiftForOT,
  type WeeklyOTSummary,
} from '@/lib/scheduling/overtime';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  calculated_pay?: number;
  actual_pay?: number;
  actual_pay_type?: 'hourly' | 'salary';
  actual_pay_annual?: number;
  active: boolean;
}

/** Snap a date to the previous (or same) Sunday. */
function toSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as YYYY-MM-DD (local). */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get array of 7 date strings (Sun–Sat) from a week-start Sunday. */
function weekDates(sunday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });
}

function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function shiftNetHours(shift: Shift): number {
  const start = parseTime(shift.start_time);
  let end = parseTime(shift.end_time);
  if (end <= start) end += 24 * 60; // cross-day shift
  return Math.max(0, (end - start) / 60 - (shift.break_minutes || 0) / 60);
}

const VALID_GRID_MODES: GridViewMode[] = ['employees', 'positions', 'setup'];

export function useScheduleData() {
  const router = useRouter();
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();
  const auth = useAuth();

  // Read initial grid view mode from URL query param
  const urlMode = typeof router.query.mode === 'string' ? router.query.mode : '';
  const initialMode: GridViewMode = VALID_GRID_MODES.includes(urlMode as GridViewMode)
    ? (urlMode as GridViewMode) : 'employees';

  // Navigation state
  const [weekStart, setWeekStartRaw] = useState<Date>(() => toSunday(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => formatDate(new Date()));
  const [gridViewMode, setGridViewModeRaw] = useState<GridViewMode>(initialMode);
  const [timeViewMode, setTimeViewMode] = useState<TimeViewMode>(initialMode === 'setup' ? 'day' : 'week');
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');

  // Sync gridViewMode with URL
  const setGridViewMode = useCallback((mode: GridViewMode) => {
    setGridViewModeRaw(mode);
    // Force day view when entering setup mode
    if (mode === 'setup') {
      setTimeViewMode('day');
    }
    // Update URL query param (shallow to avoid refetch)
    const query = { ...router.query };
    if (mode === 'employees') {
      delete query.mode;
    } else {
      query.mode = mode;
    }
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router]);

  // Sync from URL on initial load / back-forward navigation
  useEffect(() => {
    const mode = typeof router.query.mode === 'string' ? router.query.mode : 'employees';
    if (VALID_GRID_MODES.includes(mode as GridViewMode) && mode !== gridViewMode) {
      setGridViewModeRaw(mode as GridViewMode);
      if (mode === 'setup') setTimeViewMode('day');
    }
  }, [router.query.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data state
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Snap weekStart to Sunday
  const setWeekStart = useCallback((d: Date) => {
    setWeekStartRaw(toSunday(d));
  }, []);

  const weekStartStr = formatDate(weekStart);
  const days = useMemo(() => weekDates(weekStart), [weekStart]);

  const orgId = selectedLocationOrgId ?? auth.org_id;

  // ── Fetch schedule + shifts ──
  const fetchSchedule = useCallback(async () => {
    if (!selectedLocationId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/scheduling/schedules?location_id=${selectedLocationId}&week_start=${weekStartStr}`,
      );
      if (!res.ok) throw new Error('Failed to fetch schedule');
      const data = await res.json();
      setSchedule(data.schedule ?? null);
      setShifts(data.shifts ?? []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setSchedule(null);
      setShifts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId, weekStartStr]);

  // ── Fetch positions (from org_positions) ──
  const fetchPositions = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/scheduling/positions?org_id=${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch positions');
      const data = await res.json();
      setPositions(data.positions ?? []);
    } catch (err) {
      console.error('Error fetching positions:', err);
    }
  }, [orgId]);

  // ── Fetch employees ──
  const fetchEmployees = useCallback(async () => {
    if (!selectedLocationId) return;
    try {
      const res = await fetch(`/api/employees?location_id=${selectedLocationId}`);
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  }, [selectedLocationId]);

  // ── Fetch forecasts ──
  const fetchForecasts = useCallback(async () => {
    if (!selectedLocationId) return;
    try {
      const res = await fetch(
        `/api/scheduling/forecasts?location_id=${selectedLocationId}&week_start=${weekStartStr}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setForecasts(data.forecasts ?? []);
    } catch {
      // Silently fail — forecast data is non-critical
    }
  }, [selectedLocationId, weekStartStr]);

  // ── Fetch overtime rules for the location's state ──
  const [otRules, setOtRules] = useState<OvertimeRule[]>(DEFAULT_OT_RULES);

  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/scheduling/overtime-rules?location_id=${selectedLocationId}`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.rules?.length > 0) {
          setOtRules(data.rules);
        }
      } catch {
        // Use defaults on error
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  // ── Detect pending HS scheduling data for first-time import ──
  const [hsCheckDone, setHsCheckDone] = useState(false);
  const [pendingHsNotificationId, setPendingHsNotificationId] = useState<string | null>(null);

  // Reset when location changes
  useEffect(() => {
    setHsCheckDone(false);
    setPendingHsNotificationId(null);
  }, [selectedLocationId]);

  // After initial load completes with no schedule, check for pending HS scheduling data
  useEffect(() => {
    if (hsCheckDone || isLoading || schedule || !selectedLocationId) return;
    setHsCheckDone(true);

    // Check if there's an unprocessed HS sync notification with scheduling data
    const checkPendingHs = async () => {
      try {
        const res = await fetch(`/api/employees/sync-notification?location_id=${selectedLocationId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.notification?.sync_data?.has_scheduling_data && data.notification?.sync_data?.scheduling) {
          setPendingHsNotificationId(data.notification.id);
        }
      } catch {
        // Silently fail
      }
    };

    checkPendingHs();
  }, [hsCheckDone, isLoading, schedule, selectedLocationId]);

  // Called when the schedule import modal completes
  const clearPendingHsImport = useCallback(() => {
    setPendingHsNotificationId(null);
    fetchSchedule();
    fetchPositions();
  }, [fetchSchedule, fetchPositions]);

  // Refetch when location or week changes
  useEffect(() => {
    fetchSchedule();
    fetchPositions();
    fetchEmployees();
    fetchForecasts();
  }, [fetchSchedule, fetchPositions, fetchEmployees, fetchForecasts]);

  const refetch = useCallback(() => {
    fetchSchedule();
    fetchPositions();
  }, [fetchSchedule, fetchPositions]);

  // ── Filtered data by zone ──
  const filteredPositions = useMemo(() => {
    if (zoneFilter === 'all') return positions;
    return positions.filter((p) => p.zone === zoneFilter);
  }, [positions, zoneFilter]);

  const filteredEmployees = useMemo(() => {
    if (zoneFilter === 'all') return employees;
    return employees.filter((e) => {
      if (zoneFilter === 'FOH') return e.is_foh;
      if (zoneFilter === 'BOH') return e.is_boh;
      return true;
    });
  }, [employees, zoneFilter]);

  const filteredShifts = useMemo(() => {
    if (zoneFilter === 'all') return shifts;
    return shifts.filter((s) => {
      if (!s.position) return true; // show shifts without a position in all filters
      return s.position.zone === zoneFilter;
    });
  }, [shifts, zoneFilter]);

  // ── Overtime calculation for the week ──
  const otSummary = useMemo<WeeklyOTSummary | null>(() => {
    // Build ShiftForOT[] from all shifts (not zone-filtered — OT is per-employee across all zones)
    const otShifts: ShiftForOT[] = [];
    for (const shift of shifts) {
      if (!shift.assignment?.employee_id) continue;
      const emp = shift.assignment.employee as any;
      const hourlyRate = emp?.actual_pay ?? emp?.calculated_pay ?? 0;
      if (!hourlyRate || emp?.actual_pay_type === 'salary') continue;
      otShifts.push({
        id: shift.id,
        employee_id: shift.assignment.employee_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes || 0,
        hourly_rate: hourlyRate,
      });
    }
    if (otShifts.length === 0) return null;
    return calculateWeeklyOvertime(otShifts, otRules);
  }, [shifts, otRules]);

  // ── Labor summary ──
  const laborSummary = useMemo<LaborSummary>(() => {
    let totalHours = 0;
    let totalCost = 0;
    const byDay: Record<string, { hours: number; cost: number }> = {};
    const byPosition: Record<string, { hours: number; cost: number; position_name: string; zone: string }> = {};

    for (const day of days) {
      byDay[day] = { hours: 0, cost: 0 };
    }

    for (const shift of filteredShifts) {
      const hours = shiftNetHours(shift);
      const baseCost = shift.assignment?.projected_cost ?? 0;

      // Add per-shift OT premium if available
      const shiftOT = otSummary?.by_employee[shift.assignment?.employee_id ?? '']
        ?.by_shift[shift.id];
      const otPremium = shiftOT?.ot_premium ?? 0;
      const cost = baseCost + otPremium;

      totalHours += hours;
      totalCost += cost;

      if (byDay[shift.shift_date]) {
        byDay[shift.shift_date].hours += hours;
        byDay[shift.shift_date].cost += cost;
      }

      const posId = shift.position_id ?? 'unassigned';
      if (!byPosition[posId]) {
        byPosition[posId] = {
          hours: 0,
          cost: 0,
          position_name: shift.position?.name ?? 'No Position',
          zone: shift.position?.zone ?? '',
        };
      }
      byPosition[posId].hours += hours;
      byPosition[posId].cost += cost;
    }

    // OT aggregate (scoped to current zone filter)
    let regularHours = totalHours;
    let otHours = 0;
    let totalOTPremium = 0;
    if (otSummary) {
      // Sum OT from shifts that are in the current zone filter
      for (const shift of filteredShifts) {
        const empId = shift.assignment?.employee_id;
        if (!empId) continue;
        const shiftOT = otSummary.by_employee[empId]?.by_shift[shift.id];
        if (shiftOT) {
          otHours += shiftOT.ot_hours_15x + shiftOT.ot_hours_2x;
          totalOTPremium += shiftOT.ot_premium;
        }
      }
      regularHours = totalHours - otHours;
    }

    return {
      total_hours: totalHours,
      total_cost: totalCost,
      regular_hours: regularHours,
      ot_hours: otHours,
      ot_premium: totalOTPremium,
      by_day: byDay,
      by_position: byPosition,
    };
  }, [filteredShifts, days, otSummary]);

  // ── Ensure schedule exists (auto-create draft if needed) ──
  const ensureSchedule = useCallback(async (): Promise<Schedule> => {
    if (schedule) return schedule;

    const res = await fetch('/api/scheduling/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'create',
        location_id: selectedLocationId,
        org_id: orgId,
        week_start: weekStartStr,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create schedule');
    }
    const data = await res.json();
    setSchedule(data.schedule);
    return data.schedule;
  }, [schedule, selectedLocationId, orgId, weekStartStr]);

  // ── CRUD: Shifts ──
  const createShift = useCallback(async (params: {
    shift_date: string;
    end_date?: string;
    start_time: string;
    end_time: string;
    position_id?: string;
    break_minutes?: number;
    notes?: string;
    employee_id?: string;
    is_house_shift?: boolean;
  }) => {
    const sched = await ensureSchedule();
    const res = await fetch('/api/scheduling/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'create',
        schedule_id: sched.id,
        org_id: sched.org_id,
        ...params,
        break_minutes: params.break_minutes ?? 0,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create shift');
    }
    await fetchSchedule();
  }, [ensureSchedule, fetchSchedule]);

  const updateShift = useCallback(async (id: string, params: Partial<{
    position_id: string | null;
    shift_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    is_house_shift: boolean;
  }>) => {
    const res = await fetch('/api/scheduling/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'update', id, ...params }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update shift');
    }
    await fetchSchedule();
  }, [fetchSchedule]);

  const deleteShift = useCallback(async (id: string) => {
    const res = await fetch('/api/scheduling/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'delete', id }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete shift');
    }
    await fetchSchedule();
  }, [fetchSchedule]);

  // ── CRUD: Assignments ──
  const assignEmployee = useCallback(async (shiftId: string, employeeId: string) => {
    const res = await fetch('/api/scheduling/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'assign',
        shift_id: shiftId,
        employee_id: employeeId,
        org_id: orgId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to assign employee');
    }
    await fetchSchedule();
  }, [orgId, fetchSchedule]);

  const unassignEmployee = useCallback(async (shiftId: string, employeeId: string) => {
    const res = await fetch('/api/scheduling/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'unassign',
        shift_id: shiftId,
        employee_id: employeeId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to unassign employee');
    }
    await fetchSchedule();
  }, [fetchSchedule]);

  const reassignEmployee = useCallback(async (
    shiftId: string, oldEmployeeId: string, newEmployeeId: string,
  ) => {
    const res = await fetch('/api/scheduling/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'reassign',
        shift_id: shiftId,
        old_employee_id: oldEmployeeId,
        new_employee_id: newEmployeeId,
        org_id: orgId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reassign employee');
    }
    await fetchSchedule();
  }, [orgId, fetchSchedule]);

  // ── Per-shift publish state ──
  const unpublishedCount = useMemo(() => {
    // Count shifts that are new (never published) or have unpublished changes
    return shifts.filter((s) => {
      if (!s.published_at) return true; // never published
      if (s.updated_at && s.updated_at > s.published_at) return true; // edited since last publish
      return false;
    }).length;
  }, [shifts]);

  // ── Publish ──
  const publishSchedule = useCallback(async () => {
    if (!schedule) return;
    // published_by FK references app_users(id), so send appUser.id (not the Supabase auth uid)
    const appUserId = auth.appUser?.id;
    const res = await fetch('/api/scheduling/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'publish',
        id: schedule.id,
        user_id: appUserId || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to publish schedule');
    }
    // Refetch to get updated published_at timestamps on shifts
    await fetchSchedule();
  }, [schedule, auth.appUser, fetchSchedule]);

  // ── Navigation helpers ──
  const navigateWeek = useCallback((direction: -1 | 1) => {
    setWeekStartRaw(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * 7);
      return d;
    });
  }, []);

  const navigateDay = useCallback((direction: -1 | 1) => {
    setSelectedDay(prev => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + direction);
      return formatDate(d);
    });
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setWeekStartRaw(toSunday(today));
    setSelectedDay(formatDate(today));
  }, []);

  return {
    // Data
    schedule,
    shifts: filteredShifts,
    positions: filteredPositions,
    employees: filteredEmployees,
    allPositions: positions,
    laborSummary,
    forecasts,
    isLoading,
    pendingHsNotificationId,
    clearPendingHsImport,
    days,
    weekStartStr,

    // Navigation
    weekStart,
    setWeekStart,
    selectedDay,
    setSelectedDay,
    navigateWeek,
    navigateDay,
    goToToday,

    // View modes & filter
    gridViewMode,
    setGridViewMode,
    timeViewMode,
    setTimeViewMode,
    zoneFilter,
    setZoneFilter,

    // Shift CRUD
    createShift,
    updateShift,
    deleteShift,

    // Assignment CRUD
    assignEmployee,
    unassignEmployee,
    reassignEmployee,

    // Schedule actions
    publishSchedule,
    unpublishedCount,

    // Overtime
    otSummary,

    // Misc
    refetch,
    selectedLocationId,
  };
}
