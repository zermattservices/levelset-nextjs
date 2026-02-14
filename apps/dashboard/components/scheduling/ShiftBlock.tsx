import * as React from 'react';
import sty from './ShiftBlock.module.css';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { Shift, GridViewMode } from '@/lib/scheduling.types';

interface ShiftBlockProps {
  shift: Shift;
  viewMode: GridViewMode;
  isPublished: boolean;
  onClick: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

export function ShiftBlock({ shift, viewMode, isPublished, onClick, onDelete }: ShiftBlockProps) {
  const area = shift.shift_area;
  const assignment = shift.assignment;
  const areaColor = area?.color ?? '#6b7280';
  const isOpen = !assignment;
  const timeStr = `${formatTimeShort(shift.start_time)}–${formatTimeShort(shift.end_time)}`;

  // In employee view: show area name. In area view: show employee name.
  const label = viewMode === 'employees'
    ? (area?.name ?? '')
    : (assignment?.employee?.full_name ?? '');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(shift);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(shift.id);
  };

  return (
    <div
      className={`${sty.block} ${isOpen ? sty.openShift : ''}`}
      style={{
        backgroundColor: `${areaColor}18`,
        borderLeftColor: areaColor,
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className={sty.timeRow}>
        <span className={sty.time}>{timeStr}</span>
        {isPublished && (
          <LockOutlinedIcon sx={{ fontSize: 11, color: '#9ca3af' }} />
        )}
        {!isPublished && onDelete && (
          <button className={sty.deleteBtn} onClick={handleDelete} aria-label="Delete shift">
            <CloseIcon sx={{ fontSize: 12 }} />
          </button>
        )}
      </div>

      {label && <span className={sty.label}>{label}</span>}

      {isOpen && <span className={sty.openLabel}>Open</span>}

      {assignment?.employee && viewMode === 'employees' && (
        <span className={sty.costHint}>
          {assignment.projected_cost != null ? `$${assignment.projected_cost.toFixed(0)}` : ''}
        </span>
      )}
    </div>
  );
}
