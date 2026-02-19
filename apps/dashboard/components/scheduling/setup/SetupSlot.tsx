import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import sty from './SetupSlot.module.css';
import { SetupEmployeeChip } from './SetupEmployeeChip';
import type { SetupAssignment } from '@/lib/scheduling.types';

interface SetupSlotProps {
  positionId: string;
  slotIndex: number;
  isRequired: boolean;
  assignment?: SetupAssignment;
}

export function SetupSlot({ positionId, slotIndex, isRequired, assignment }: SetupSlotProps) {
  const droppableId = `slot-${positionId}-${slotIndex}`;

  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: {
      type: 'slot',
      positionId,
      slotIndex,
    },
  });

  if (assignment) {
    return (
      <div ref={setNodeRef} className={`${sty.slot} ${sty.slotFilled} ${isOver ? sty.slotOver : ''}`}>
        <SetupEmployeeChip
          employeeName={assignment.employee?.full_name ?? 'Unknown'}
          assignmentId={assignment.id}
          employeeId={assignment.employee_id}
          positionId={positionId}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`${sty.slot} ${sty.slotEmpty} ${isRequired ? sty.slotRequired : sty.slotOptional} ${isOver ? sty.slotOver : ''}`}
    >
      <span className={sty.emptyLabel}>
        {isRequired ? 'Drag employee here' : 'Optional'}
      </span>
    </div>
  );
}
