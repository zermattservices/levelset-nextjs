import * as React from 'react';
import { DndContext, DragOverlay, closestCenter, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import sty from './SetupBoardView.module.css';
import { SetupDaypartBar } from './SetupDaypartBar';
import { SetupPositionGrid } from './SetupPositionGrid';
import { SetupEmployeePanel } from './SetupEmployeePanel';
import { SetupEmployeeChip } from './SetupEmployeeChip';
import type { Shift, Position, SetupAssignment, ResolvedPositionSlots } from '@/lib/scheduling.types';
import type { DaypartId } from '@/lib/scheduling/dayparts';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  calculated_pay?: number;
  active: boolean;
}

interface AvailableEmployee extends Employee {
  shift: Shift;
  currentAssignment: SetupAssignment | null;
}

interface SetupBoardViewProps {
  // Dayparts
  resolvedDayparts: { id: DaypartId; label: string; start: string; end: string }[];
  activeDaypartId: DaypartId;
  onDaypartChange: (id: DaypartId) => void;

  // Position slots
  positionSlots: ResolvedPositionSlots[];

  // Employees
  availableEmployees: AvailableEmployee[];

  // Assignments
  onAssign: (shiftId: string, employeeId: string, positionId: string) => Promise<void>;
  onUnassign: (assignmentId: string) => Promise<void>;
  onReassign: (assignmentId: string, newPositionId: string) => Promise<void>;

  // Templates
  onManageTemplates: () => void;

  // Loading
  isLoading: boolean;
}

export function SetupBoardView({
  resolvedDayparts,
  activeDaypartId,
  onDaypartChange,
  positionSlots,
  availableEmployees,
  onAssign,
  onUnassign,
  onReassign,
  onManageTemplates,
  isLoading,
}: SetupBoardViewProps) {
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [activeDragData, setActiveDragData] = React.useState<any>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    setActiveDragData(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragData(null);

    if (!over) {
      // Dropped outside — if it was an assigned chip, unassign it
      if (active.data.current?.type === 'assignment') {
        onUnassign(active.data.current.assignmentId);
      }
      return;
    }

    const overId = over.id as string;

    // Dropped on the employee panel → unassign
    if (overId === 'employee-panel') {
      if (active.data.current?.type === 'assignment') {
        onUnassign(active.data.current.assignmentId);
      }
      return;
    }

    // Dropped on a position slot
    if (overId.startsWith('slot-')) {
      const positionId = over.data.current?.positionId;
      if (!positionId) return;

      if (active.data.current?.type === 'employee') {
        // Dragged from panel → assign
        const employeeId = active.data.current.employeeId;
        const shiftId = active.data.current.shiftId;
        if (employeeId && shiftId) {
          onAssign(shiftId, employeeId, positionId);
        }
      } else if (active.data.current?.type === 'assignment') {
        // Dragged from another slot → reassign
        const assignmentId = active.data.current.assignmentId;
        const currentPositionId = active.data.current.positionId;
        if (assignmentId && positionId !== currentPositionId) {
          onReassign(assignmentId, positionId);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setActiveDragData(null);
  };

  // Find the dragged employee for the overlay
  const draggedEmployee = React.useMemo(() => {
    if (!activeDragData) return null;
    if (activeDragData.type === 'employee') {
      return availableEmployees.find(e => e.id === activeDragData.employeeId) ?? null;
    }
    if (activeDragData.type === 'assignment') {
      return availableEmployees.find(e => e.id === activeDragData.employeeId) ?? null;
    }
    return null;
  }, [activeDragData, availableEmployees]);

  if (isLoading) {
    return (
      <div className={sty.loadingContainer}>
        <div className={sty.loadingSpinner} />
        <span className={sty.loadingText}>Loading setup board...</span>
      </div>
    );
  }

  return (
    <div className={sty.root}>
      <SetupDaypartBar
        dayparts={resolvedDayparts}
        activeDaypartId={activeDaypartId}
        onDaypartChange={onDaypartChange}
        onManageTemplates={onManageTemplates}
      />

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={sty.boardContent}>
          <SetupPositionGrid
            positionSlots={positionSlots}
            availableEmployees={availableEmployees}
          />
          <SetupEmployeePanel
            employees={availableEmployees}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedEmployee && (
            <SetupEmployeeChip
              employeeName={draggedEmployee.full_name}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
