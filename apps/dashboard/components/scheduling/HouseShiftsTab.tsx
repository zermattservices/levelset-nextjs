import * as React from 'react';
import sty from './BottomPanel.module.css';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Shift } from '@/lib/scheduling.types';

interface HouseShiftsTabProps {
  houseShifts: Shift[];
  isPublished: boolean;
  onDeleteShift: (id: string) => Promise<void>;
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const ZONE_LABELS: Record<string, string> = { BOH: 'Back of House', FOH: 'Front of House' };

export function HouseShiftsTab({ houseShifts, isPublished, onDeleteShift }: HouseShiftsTabProps) {
  if (houseShifts.length === 0) {
    return (
      <div className={sty.emptyState}>
        <span className={sty.emptyText}>No house shifts available.</span>
        <span className={sty.emptySubText}>Mark shifts as house shifts in the shift editor.</span>
      </div>
    );
  }

  return (
    <table className={sty.table}>
      <thead>
        <tr>
          <th className={sty.th}>Position</th>
          <th className={sty.th}>Date</th>
          <th className={sty.th}>Time</th>
          <th className={sty.th}>Zone</th>
          <th className={sty.th} style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {houseShifts.map((shift) => (
          <tr key={shift.id} className={sty.tr}>
            <td className={sty.td}>{shift.position?.name ?? 'No Position'}</td>
            <td className={sty.td}>{formatDate(shift.shift_date)}</td>
            <td className={sty.td}>{formatTimeShort(shift.start_time)}–{formatTimeShort(shift.end_time)}</td>
            <td className={sty.td}>{shift.position ? ZONE_LABELS[shift.position.zone] ?? shift.position.zone : '—'}</td>
            <td className={sty.td}>
              {!isPublished && (
                <IconButton size="small" onClick={() => onDeleteShift(shift.id)} sx={{ padding: '2px' }}>
                  <DeleteOutlineIcon sx={{ fontSize: 14, color: 'var(--ls-color-destructive)' }} />
                </IconButton>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
