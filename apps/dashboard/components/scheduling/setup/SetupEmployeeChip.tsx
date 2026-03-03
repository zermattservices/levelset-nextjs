import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import sty from './SetupEmployeeChip.module.css';

interface SetupEmployeeChipProps {
  employeeName: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftPositionName?: string;
  /** When inside a slot — provides assignment context for drag */
  assignmentId?: string;
  employeeId?: string;
  positionId?: string;
  /** True when rendered inside DragOverlay */
  isOverlay?: boolean;
}

export function SetupEmployeeChip({
  employeeName,
  shiftStartTime,
  shiftEndTime,
  shiftPositionName,
  assignmentId,
  employeeId,
  positionId,
  isOverlay,
}: SetupEmployeeChipProps) {
  // Only make it draggable when it's an assigned chip (not the overlay copy)
  if (isOverlay) {
    return (
      <div className={`${sty.chip} ${sty.chipOverlay}`}>
        <div className={sty.employeeInfo}>
          <span className={sty.employeeName}>{employeeName}</span>
        </div>
      </div>
    );
  }

  return (
    <DraggableChip
      employeeName={employeeName}
      shiftStartTime={shiftStartTime}
      shiftEndTime={shiftEndTime}
      shiftPositionName={shiftPositionName}
      assignmentId={assignmentId}
      employeeId={employeeId}
      positionId={positionId}
    />
  );
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

function DraggableChip({
  employeeName,
  shiftStartTime,
  shiftEndTime,
  shiftPositionName,
  assignmentId,
  employeeId,
  positionId,
}: {
  employeeName: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftPositionName?: string;
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
      <div className={sty.employeeInfo}>
        <span className={sty.employeeName}>{employeeName}</span>
        {shiftStartTime && shiftEndTime && (
          <span className={sty.employeeShift}>
            {formatTime12(shiftStartTime)} - {formatTime12(shiftEndTime)}
            {shiftPositionName && <span className={sty.positionLabel}> · {shiftPositionName}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
