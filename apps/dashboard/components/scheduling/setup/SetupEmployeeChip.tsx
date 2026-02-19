import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import sty from './SetupEmployeeChip.module.css';

interface SetupEmployeeChipProps {
  employeeName: string;
  /** When inside a slot — provides assignment context for drag */
  assignmentId?: string;
  employeeId?: string;
  positionId?: string;
  /** True when rendered inside DragOverlay */
  isOverlay?: boolean;
}

export function SetupEmployeeChip({
  employeeName,
  assignmentId,
  employeeId,
  positionId,
  isOverlay,
}: SetupEmployeeChipProps) {
  // Only make it draggable when it's an assigned chip (not the overlay copy)
  if (isOverlay) {
    return (
      <div className={`${sty.chip} ${sty.chipOverlay}`}>
        <span className={sty.chipName}>{employeeName}</span>
      </div>
    );
  }

  return (
    <DraggableChip
      employeeName={employeeName}
      assignmentId={assignmentId}
      employeeId={employeeId}
      positionId={positionId}
    />
  );
}

function DraggableChip({
  employeeName,
  assignmentId,
  employeeId,
  positionId,
}: {
  employeeName: string;
  assignmentId?: string;
  employeeId?: string;
  positionId?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: assignmentId ? `assignment-${assignmentId}` : `chip-${employeeId}`,
    data: {
      type: 'assignment',
      assignmentId,
      employeeId,
      positionId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${sty.chip} ${isDragging ? sty.chipDragging : ''}`}
    >
      <span className={sty.chipName}>{employeeName}</span>
    </div>
  );
}
