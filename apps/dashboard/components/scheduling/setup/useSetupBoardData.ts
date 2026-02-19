import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import {
  resolveDaypartTimes,
  getCurrentDaypart,
  type DaypartId,
} from '@/lib/scheduling/dayparts';
import type {
  Shift,
  Position,
  SetupTemplate,
  SetupAssignment,
  ResolvedPositionSlots,
} from '@/lib/scheduling.types';
import type { LocationBusinessHours } from '@/lib/supabase.types';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  calculated_pay?: number;
  active: boolean;
}

interface UseSetupBoardDataProps {
  selectedDay: string;
  shifts: Shift[];
  positions: Position[];
  employees: Employee[];
  businessHours: LocationBusinessHours[];
  zoneFilter: 'all' | 'FOH' | 'BOH';
}

/** Parse HH:MM to minutes since midnight. */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Get business hours for a specific day. Returns open/close times. */
function getBusinessHoursForDay(
  businessHours: LocationBusinessHours[],
  dateStr: string,
): { open: string | null; close: string | null } {
  if (!businessHours || businessHours.length === 0) return { open: null, close: null };

  const dayIndex = new Date(dateStr + 'T00:00:00').getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayIndex];

  const bh = businessHours.find((h: any) => h.day === dayName);
  if (!bh) return { open: null, close: null };

  return {
    open: (bh as any).open_time ?? null,
    close: (bh as any).close_time ?? null,
  };
}

export function useSetupBoardData({
  selectedDay,
  shifts,
  positions,
  employees,
  businessHours,
  zoneFilter,
}: UseSetupBoardDataProps) {
  const { selectedLocationOrgId } = useLocationContext();
  const auth = useAuth();
  const orgId = selectedLocationOrgId ?? auth.org_id;

  // Template state
  const [templates, setTemplates] = useState<SetupTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Resolved slots for the selected day
  const [resolvedSlots, setResolvedSlots] = useState<Record<string, any>>({});
  const [resolvedLoading, setResolvedLoading] = useState(false);

  // Setup assignments for the selected day + current time window
  const [assignments, setAssignments] = useState<SetupAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Template manager modal state
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  // Active daypart
  const { open: openTime, close: closeTime } = useMemo(
    () => getBusinessHoursForDay(businessHours, selectedDay),
    [businessHours, selectedDay],
  );

  const resolvedDayparts = useMemo(
    () => resolveDaypartTimes(openTime, closeTime),
    [openTime, closeTime],
  );

  const [activeDaypartId, setActiveDaypartId] = useState<DaypartId>(() =>
    getCurrentDaypart(resolvedDayparts),
  );

  // Reset daypart to current when switching days
  useEffect(() => {
    setActiveDaypartId(getCurrentDaypart(resolvedDayparts));
  }, [selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeDaypart = useMemo(
    () => resolvedDayparts.find((dp) => dp.id === activeDaypartId) ?? resolvedDayparts[0],
    [resolvedDayparts, activeDaypartId],
  );

  // ── Fetch templates ──
  const fetchTemplates = useCallback(async () => {
    if (!orgId) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch(`/api/scheduling/setup-templates?org_id=${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (err) {
      console.error('Error fetching setup templates:', err);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Fetch resolved slots for the day ──
  const fetchResolvedSlots = useCallback(async () => {
    if (!orgId || !selectedDay) return;
    setResolvedLoading(true);
    try {
      const res = await fetch(
        `/api/scheduling/setup-resolved?org_id=${orgId}&date=${selectedDay}`,
      );
      if (!res.ok) throw new Error('Failed to fetch resolved slots');
      const data = await res.json();
      setResolvedSlots(data.resolved_slots ?? {});
    } catch (err) {
      console.error('Error fetching resolved slots:', err);
      setResolvedSlots({});
    } finally {
      setResolvedLoading(false);
    }
  }, [orgId, selectedDay]);

  useEffect(() => {
    fetchResolvedSlots();
  }, [fetchResolvedSlots]);

  // ── Fetch assignments for the current daypart ──
  const fetchAssignments = useCallback(async () => {
    if (!orgId || !selectedDay || !activeDaypart) return;
    setAssignmentsLoading(true);
    try {
      const res = await fetch(
        `/api/scheduling/setup-assignments?org_id=${orgId}&date=${selectedDay}&start_time=${activeDaypart.start}&end_time=${activeDaypart.end}`,
      );
      if (!res.ok) throw new Error('Failed to fetch setup assignments');
      const data = await res.json();
      setAssignments(data.assignments ?? []);
    } catch (err) {
      console.error('Error fetching setup assignments:', err);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [orgId, selectedDay, activeDaypart]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ── CRUD: Assignments ──
  const assignEmployee = useCallback(
    async (shiftId: string, employeeId: string, positionId: string) => {
      if (!orgId || !activeDaypart) return;
      try {
        const res = await fetch('/api/scheduling/setup-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'assign',
            org_id: orgId,
            shift_id: shiftId,
            employee_id: employeeId,
            position_id: positionId,
            assignment_date: selectedDay,
            start_time: activeDaypart.start,
            end_time: activeDaypart.end,
          }),
        });
        if (!res.ok) throw new Error('Failed to assign');
        await fetchAssignments();
      } catch (err) {
        console.error('Error assigning employee:', err);
      }
    },
    [orgId, selectedDay, activeDaypart, fetchAssignments],
  );

  const unassignEmployee = useCallback(
    async (assignmentId: string) => {
      try {
        const res = await fetch('/api/scheduling/setup-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: 'unassign', id: assignmentId }),
        });
        if (!res.ok) throw new Error('Failed to unassign');
        await fetchAssignments();
      } catch (err) {
        console.error('Error unassigning employee:', err);
      }
    },
    [fetchAssignments],
  );

  const reassignEmployee = useCallback(
    async (assignmentId: string, newPositionId: string) => {
      try {
        const res = await fetch('/api/scheduling/setup-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'reassign',
            id: assignmentId,
            position_id: newPositionId,
          }),
        });
        if (!res.ok) throw new Error('Failed to reassign');
        await fetchAssignments();
      } catch (err) {
        console.error('Error reassigning employee:', err);
      }
    },
    [fetchAssignments],
  );

  // ── Computed: positions filtered by zone with resolved slot counts ──
  const filteredPositions = useMemo(() => {
    let filtered = positions.filter(
      (p) => p.scheduling_enabled !== false && p.is_active,
    );
    if (zoneFilter !== 'all') {
      filtered = filtered.filter((p) => p.zone === zoneFilter);
    }
    // Exclude scheduling_only (general) positions — setup board works with real positions
    filtered = filtered.filter((p) => p.position_type !== 'scheduling_only');
    return filtered;
  }, [positions, zoneFilter]);

  // ── Computed: resolved position slots for the active daypart ──
  const positionSlots = useMemo((): ResolvedPositionSlots[] => {
    if (!activeDaypart) return [];

    return filteredPositions.map((pos) => {
      // Find the max slot count for this position across all 30-min increments in the daypart
      let maxSlotCount = 0;
      let isRequired = true;
      const dpStartMin = parseTime(activeDaypart.start);
      const dpEndMin = parseTime(activeDaypart.end);

      for (let min = dpStartMin; min < dpEndMin; min += 30) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const timeKey = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotData = resolvedSlots[timeKey]?.positions?.[pos.id];
        if (slotData) {
          if (slotData.slot_count > maxSlotCount) {
            maxSlotCount = slotData.slot_count;
            isRequired = slotData.is_required;
          }
        }
      }

      // Build slot array with assignments
      const posAssignments = assignments.filter((a) => a.position_id === pos.id);
      // Always show at least 1 slot per position, or enough for existing assignments
      const effectiveSlotCount = Math.max(1, maxSlotCount, posAssignments.length);
      const slots = Array.from({ length: effectiveSlotCount }, (_, i) => ({
        index: i,
        is_required: i < maxSlotCount ? isRequired : false,
        assignment: posAssignments[i] ?? undefined,
      }));

      return {
        position_id: pos.id,
        position_name: pos.name,
        zone: pos.zone,
        slots,
      };
    });
  }, [filteredPositions, activeDaypart, resolvedSlots, assignments]);

  // ── Computed: employees available during this daypart ──
  const availableEmployees = useMemo(() => {
    if (!activeDaypart) return [];

    const dpStartMin = parseTime(activeDaypart.start);
    const dpEndMin = parseTime(activeDaypart.end);

    // Find employees with shifts overlapping this daypart on this day
    const employeesWithShifts = new Map<string, Shift>();
    for (const shift of shifts) {
      if (shift.shift_date !== selectedDay) continue;
      if (shift.is_house_shift) continue;
      if (!shift.assignment?.employee_id) continue;

      const shiftStartMin = parseTime(shift.start_time);
      let shiftEndMin = parseTime(shift.end_time);
      if (shiftEndMin <= shiftStartMin) shiftEndMin += 24 * 60;

      // Check overlap
      if (shiftStartMin < dpEndMin && shiftEndMin > dpStartMin) {
        employeesWithShifts.set(shift.assignment.employee_id, shift);
      }
    }

    return employees
      .filter((emp) => employeesWithShifts.has(emp.id))
      .map((emp) => {
        const shift = employeesWithShifts.get(emp.id)!;
        const assignment = assignments.find((a) => a.employee_id === emp.id);
        return {
          ...emp,
          shift,
          currentAssignment: assignment ?? null,
        };
      })
      .sort((a, b) => {
        // Unassigned first, then alphabetical
        if (a.currentAssignment && !b.currentAssignment) return 1;
        if (!a.currentAssignment && b.currentAssignment) return -1;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [employees, shifts, assignments, activeDaypart, selectedDay]);

  const isLoading = templatesLoading || resolvedLoading || assignmentsLoading;

  return {
    // Dayparts
    resolvedDayparts,
    activeDaypartId,
    setActiveDaypartId,
    activeDaypart,

    // Positions + slots
    positionSlots,
    filteredPositions,

    // Employees
    availableEmployees,

    // Assignments CRUD
    assignments,
    assignEmployee,
    unassignEmployee,
    reassignEmployee,

    // Templates
    templates,
    fetchTemplates,
    templateManagerOpen,
    setTemplateManagerOpen,

    // Loading
    isLoading,

    // Refetch
    refetchAssignments: fetchAssignments,
    refetchResolvedSlots: fetchResolvedSlots,
  };
}
