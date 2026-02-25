import * as React from 'react';
import styles from './HouseShiftsTab.module.css';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Shift } from '@/lib/scheduling.types';

interface HouseShiftsTabProps {
  houseShifts: Shift[];
  isPublished: boolean;
  onDeleteShift: (id: string) => Promise<void>;
  /** Called when user drops a house shift card onto an employee row */
  onAssignShift?: (shiftId: string, employeeId: string) => Promise<void>;
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

export function HouseShiftsTab({ houseShifts, isPublished, onDeleteShift }: HouseShiftsTabProps) {
  if (houseShifts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyText}>No house shifts available.</span>
        <span className={styles.emptySubText}>
          House shifts are unassigned shifts. Drag them to an employee row to assign.
        </span>
      </div>
    );
  }

  // Group shifts by date, sorted chronologically
  const grouped = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    const sorted = [...houseShifts].sort((a, b) => {
      const dateComp = a.shift_date.localeCompare(b.shift_date);
      if (dateComp !== 0) return dateComp;
      return a.start_time.localeCompare(b.start_time);
    });
    for (const shift of sorted) {
      const existing = map.get(shift.shift_date) || [];
      existing.push(shift);
      map.set(shift.shift_date, existing);
    }
    return Array.from(map.entries());
  }, [houseShifts]);

  const handleDragStart = React.useCallback((e: React.DragEvent, shift: Shift) => {
    e.dataTransfer.setData('application/x-house-shift', JSON.stringify({
      shiftId: shift.id,
      positionName: shift.position?.name || 'No Position',
      startTime: shift.start_time,
      endTime: shift.end_time,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
    <div className={styles.container}>
      {grouped.map(([date, shifts]) => (
        <div key={date} className={styles.dayGroup}>
          <div className={styles.dayHeader}>{formatDayHeader(date)}</div>
          <div className={styles.cardRow}>
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={styles.card}
                draggable={!isPublished}
                onDragStart={(e) => handleDragStart(e, shift)}
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardPosition}>
                    {shift.position?.name ?? 'No Position'}
                  </span>
                  {!isPublished && (
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onDeleteShift(shift.id); }}
                      sx={{ padding: '2px', marginLeft: 'auto' }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 13, color: 'var(--ls-color-destructive)' }} />
                    </IconButton>
                  )}
                </div>
                <div className={styles.cardTime}>
                  {formatTimeShort(shift.start_time)}–{formatTimeShort(shift.end_time)}
                </div>
                {shift.position?.zone && (
                  <div className={styles.cardZone}>
                    {shift.position.zone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
