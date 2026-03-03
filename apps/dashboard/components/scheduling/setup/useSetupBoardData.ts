import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import type {
  Shift,
  Position,
  SetupTemplate,
  SetupAssignment,
  ResolvedPositionSlots,
  ResolvedBlock,
} from '@/lib/scheduling.types';

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

interface UseSetupBoardDataProps {
  selectedDay: string;
  shifts: Shift[];
  positions: Position[];
  employees: Employee[];
  zoneFilter: 'FOH' | 'BOH';
}

/** Parse HH:MM to minutes since midnight. */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function useSetupBoardData({
  selectedDay,
  shifts,
  positions,
  employees,
  zoneFilter,
}: UseSetupBoardDataProps) {
  const { selectedLocationOrgId } = useLocationContext();
  const auth = useAuth();
  const orgId = selectedLocationOrgId ?? auth.org_id;

  // Template state
  const [templates, setTemplates] = useState<SetupTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Block state (replaces dayparts)
  const [blocks, setBlocks] = useState<ResolvedBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);

  // Setup assignments for the active block
  const [assignments, setAssignments] = useState<SetupAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Template manager modal state
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  const activeBlock = useMemo(
    () => blocks[activeBlockIndex] ?? null,
    [blocks, activeBlockIndex],
  );

  // Reset active block index when blocks change
  useEffect(() => {
    if (blocks.length === 0) {
      setActiveBlockIndex(0);
      return;
    }
    // Find the block whose time range contains "now"
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let bestIndex = 0;
    for (let i = 0; i < blocks.length; i++) {
      const blockStart = parseTime(blocks[i].block_time);
      const blockEnd = parseTime(blocks[i].end_time);
      if (nowMin >= blockStart && nowMin < blockEnd) {
        bestIndex = i;
        break;
      }
      if (blockStart <= nowMin) {
        bestIndex = i;
      }
    }
    setActiveBlockIndex(bestIndex);
  }, [blocks]);

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

  // ── Fetch resolved blocks for the day + zone ──
  const fetchBlocks = useCallback(async () => {
    if (!orgId || !selectedDay || !zoneFilter) return;
    setBlocksLoading(true);
    try {
      const res = await fetch(
        `/api/scheduling/setup-resolved?org_id=${orgId}&date=${selectedDay}&zone=${zoneFilter}`,
      );
      if (!res.ok) throw new Error('Failed to fetch resolved blocks');
      const data = await res.json();
      setBlocks(data.blocks ?? []);
    } catch (err) {
      console.error('Error fetching resolved blocks:', err);
      setBlocks([]);
    } finally {
      setBlocksLoading(false);
    }
  }, [orgId, selectedDay, zoneFilter]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // ── Fetch assignments for the active block ──
  const fetchAssignments = useCallback(async () => {
    if (!orgId || !selectedDay || !activeBlock) return;
    setAssignmentsLoading(true);
    try {
      const res = await fetch(
        `/api/scheduling/setup-assignments?org_id=${orgId}&date=${selectedDay}&start_time=${activeBlock.block_time}&end_time=${activeBlock.end_time}`,
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
  }, [orgId, selectedDay, activeBlock]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ── CRUD: Assignments ──
  const assignEmployee = useCallback(
    async (shiftId: string, employeeId: string, positionId: string) => {
      if (!orgId || !activeBlock) return;
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
            start_time: activeBlock.block_time,
            end_time: activeBlock.end_time,
          }),
        });
        if (!res.ok) throw new Error('Failed to assign');
        await fetchAssignments();
      } catch (err) {
        console.error('Error assigning employee:', err);
      }
    },
    [orgId, selectedDay, activeBlock, fetchAssignments],
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

  // ── Computed: positions filtered by zone ──
  const filteredPositions = useMemo(() => {
    let filtered = positions.filter(
      (p) => p.scheduling_enabled !== false && p.is_active,
    );
    filtered = filtered.filter((p) => p.zone === zoneFilter);
    // Exclude scheduling_only (general) positions — setup board works with real positions
    filtered = filtered.filter((p) => p.position_type !== 'scheduling_only');
    return filtered;
  }, [positions, zoneFilter]);

  // ── Computed: position slots from active block ──
  const positionSlots = useMemo((): ResolvedPositionSlots[] => {
    if (!activeBlock) return [];

    return filteredPositions
      .filter((pos) => pos.id in activeBlock.positions)
      .map((pos) => {
        const blockPos = activeBlock.positions[pos.id];
        const slotCount = blockPos?.slot_count ?? 0;
        const isRequired = blockPos?.is_required ?? true;

        // Build slot array with assignments
        const posAssignments = assignments.filter((a) => a.position_id === pos.id);

        if (slotCount === 0) {
          // Position enabled but no slots — header only, no drop targets
          return {
            position_id: pos.id,
            position_name: pos.name,
            zone: pos.zone,
            slots: [],
          };
        }

        const effectiveSlotCount = Math.max(slotCount, posAssignments.length);
        const slots = Array.from({ length: effectiveSlotCount }, (_, i) => ({
          index: i,
          is_required: i < slotCount ? isRequired : false,
          assignment: posAssignments[i] ?? undefined,
        }));

        return {
          position_id: pos.id,
          position_name: pos.name,
          zone: pos.zone,
          slots,
        };
      });
  }, [filteredPositions, activeBlock, assignments]);

  // ── Computed: employees available during this block ──
  const availableEmployees = useMemo(() => {
    if (!activeBlock) return [];

    const blockStartMin = parseTime(activeBlock.block_time);
    const blockEndMin = parseTime(activeBlock.end_time);

    // Find employees with shifts overlapping this block on this day
    const employeesWithShifts = new Map<string, Shift>();
    for (const shift of shifts) {
      if (shift.shift_date !== selectedDay) continue;
      if (shift.is_house_shift) continue;
      if (!shift.assignment?.employee_id) continue;

      const shiftStartMin = parseTime(shift.start_time);
      let shiftEndMin = parseTime(shift.end_time);
      if (shiftEndMin <= shiftStartMin) shiftEndMin += 24 * 60;

      // Check overlap
      if (shiftStartMin < blockEndMin && shiftEndMin > blockStartMin) {
        employeesWithShifts.set(shift.assignment.employee_id, shift);
      }
    }

    return employees
      .filter((emp) => employeesWithShifts.has(emp.id))
      // Apply zone filter
      .filter((emp) => {
        if (zoneFilter === 'FOH') return emp.is_foh;
        if (zoneFilter === 'BOH') return emp.is_boh;
        return true;
      })
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
        // Unassigned first, then by earliest shift start time
        if (a.currentAssignment && !b.currentAssignment) return 1;
        if (!a.currentAssignment && b.currentAssignment) return -1;
        const aStart = parseTime(a.shift.start_time);
        const bStart = parseTime(b.shift.start_time);
        if (aStart !== bStart) return aStart - bStart;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [employees, shifts, assignments, activeBlock, selectedDay, zoneFilter]);

  const isLoading = templatesLoading || blocksLoading || assignmentsLoading;

  return {
    // Blocks
    blocks,
    activeBlockIndex,
    setActiveBlockIndex,
    activeBlock,

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
    refetchBlocks: fetchBlocks,
  };
}
