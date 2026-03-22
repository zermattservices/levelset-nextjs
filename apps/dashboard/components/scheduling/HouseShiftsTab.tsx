import * as React from 'react';
import styles from './HouseShiftsTab.module.css';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import type { Shift, Position, TimeViewMode } from '@/lib/scheduling.types';

interface HouseShiftsTabProps {
  houseShifts: Shift[];
  isPublished: boolean;
  onDeleteShift: (id: string) => Promise<void>;
  onCreateShift?: (params: {
    shift_date: string;
    start_time: string;
    end_time: string;
    position_id?: string;
    is_house_shift?: boolean;
  }) => Promise<void>;
  onCreateBulkHouseShifts?: (shifts: Array<{
    shift_date: string;
    start_time: string;
    end_time: string;
    position_id?: string;
  }>) => Promise<void>;
  positions?: Position[];
  days?: string[];
  timeViewMode?: TimeViewMode;
  selectedDay?: string;
  /** Called when user drops a house shift card onto an employee row */
  onAssignShift?: (shiftId: string, employeeId: string) => Promise<void>;
}

interface PendingHouseShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  positionId: string;
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

function formatDayOption(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

let nextPendingId = 0;

function CreateHouseShiftModal({
  open,
  onClose,
  onSave,
  positions,
  days,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (shifts: PendingHouseShift[]) => Promise<void>;
  positions: Position[];
  days: string[];
}) {
  const [rows, setRows] = React.useState<PendingHouseShift[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Initialize with one empty row
  React.useEffect(() => {
    if (open) {
      setRows([{
        id: `pending-${nextPendingId++}`,
        date: days[1] || days[0] || '',
        startTime: '09:00',
        endTime: '17:00',
        positionId: positions[0]?.id ?? '',
      }]);
      setSaving(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows([...rows, {
      id: `pending-${nextPendingId++}`,
      date: lastRow?.date || days[1] || days[0] || '',
      startTime: lastRow?.startTime || '09:00',
      endTime: lastRow?.endTime || '17:00',
      positionId: lastRow?.positionId || positions[0]?.id || '',
    }]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof PendingHouseShift, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rows);
      onClose();
    } catch (err) {
      console.error('Failed to create house shifts:', err);
      setSaving(false);
    }
  };

  if (!open) return null;

  const validRows = rows.filter(r => r.date && r.startTime && r.endTime);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create House Shifts</h2>
          <IconButton size="small" onClick={onClose} sx={{ color: 'var(--ls-color-muted)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        {/* Column headers */}
        <div className={styles.modalBody}>
          <div className={styles.rowHeader}>
            <span className={styles.colLabel} style={{ flex: '0 0 130px' }}>Date</span>
            <span className={styles.colLabel} style={{ flex: '0 0 110px' }}>Start Time</span>
            <span className={styles.colLabel} style={{ flex: '0 0 110px' }}>End Time</span>
            <span className={styles.colLabel} style={{ flex: 1 }}>Position</span>
            <span style={{ width: 32 }} />
          </div>

          {/* Rows */}
          <div className={styles.rowList}>
            {rows.map((row) => (
              <div key={row.id} className={styles.shiftRow}>
                <select
                  className={styles.input}
                  style={{ flex: '0 0 130px' }}
                  value={row.date}
                  onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                >
                  {days.map(d => (
                    <option key={d} value={d}>{formatDayOption(d)}</option>
                  ))}
                </select>
                <input
                  type="time"
                  className={styles.input}
                  style={{ flex: '0 0 110px' }}
                  value={row.startTime}
                  onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                />
                <input
                  type="time"
                  className={styles.input}
                  style={{ flex: '0 0 110px' }}
                  value={row.endTime}
                  onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                />
                <select
                  className={styles.input}
                  style={{ flex: 1 }}
                  value={row.positionId}
                  onChange={(e) => updateRow(row.id, 'positionId', e.target.value)}
                >
                  <option value="">No Position</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.zone})</option>
                  ))}
                </select>
                <IconButton
                  size="small"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  sx={{ padding: '4px', color: 'var(--ls-color-muted)', '&:hover': { color: 'var(--ls-color-destructive-base)' } }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </div>
            ))}
          </div>

          {/* Add row button */}
          <button className={styles.addRowBtn} onClick={addRow}>
            <AddIcon sx={{ fontSize: 14 }} />
            Add another shift
          </button>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || validRows.length === 0}
          >
            {saving ? 'Creating...' : `Create ${validRows.length} house shift${validRows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HouseShiftsTab({ houseShifts, isPublished, onDeleteShift, onCreateShift, onCreateBulkHouseShifts, positions, days, timeViewMode, selectedDay }: HouseShiftsTabProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleSave = React.useCallback(async (pendingShifts: PendingHouseShift[]) => {
    // Prefer bulk method (single API call, no page reload)
    if (onCreateBulkHouseShifts) {
      await onCreateBulkHouseShifts(pendingShifts.map(s => ({
        shift_date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        position_id: s.positionId || undefined,
      })));
      return;
    }
    // Fallback to sequential creates
    if (!onCreateShift) return;
    for (const s of pendingShifts) {
      await onCreateShift({
        shift_date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        position_id: s.positionId || undefined,
        is_house_shift: true,
      });
    }
  }, [onCreateBulkHouseShifts, onCreateShift]);

  // Filter house shifts to selected day in day view
  const filteredHouseShifts = React.useMemo(() => {
    if (timeViewMode === 'day' && selectedDay) {
      return houseShifts.filter(s => s.shift_date === selectedDay);
    }
    return houseShifts;
  }, [houseShifts, timeViewMode, selectedDay]);

  // Group shifts by date, sorted chronologically
  const grouped = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    const sorted = [...filteredHouseShifts].sort((a, b) => {
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
  }, [filteredHouseShifts]);

  const handleDragStart = React.useCallback((e: React.DragEvent, shift: Shift) => {
    const dragData = {
      shiftId: shift.id,
      shiftDate: shift.shift_date,
      positionName: shift.position?.name || 'No Position',
      startTime: shift.start_time,
      endTime: shift.end_time,
    };
    e.dataTransfer.setData('application/x-house-shift', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    // Set module-level drag state so ScheduleGrid can read it during dragover
    // (dataTransfer is restricted during dragover in most browsers)
    (window as any).__levelsetDragHouseShift = dragData;
  }, []);

  const handleDragEnd = React.useCallback(() => {
    delete (window as any).__levelsetDragHouseShift;
  }, []);

  const canCreate = !!(onCreateShift || onCreateBulkHouseShifts);

  return (
    <div className={styles.container}>
      {filteredHouseShifts.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>No house shifts available.</span>
          <span className={styles.emptySubText}>
            House shifts are unassigned shifts. Drag them to an employee row to assign.
          </span>
          {canCreate && (
            <button className={styles.createBtn} onClick={() => setModalOpen(true)} style={{ marginTop: 8 }}>
              <AddIcon sx={{ fontSize: 14 }} />
              Create House Shifts
            </button>
          )}
        </div>
      )}

      {grouped.map(([date, shifts], groupIdx) => (
        <div key={date} className={styles.dayGroup}>
          <div className={styles.dayHeaderRow}>
            <div className={styles.dayHeader}>{formatDayHeader(date)}</div>
            {groupIdx === 0 && canCreate && (
              <button className={styles.createBtn} onClick={() => setModalOpen(true)}>
                <AddIcon sx={{ fontSize: 14 }} />
                Create House Shifts
              </button>
            )}
          </div>
          <div className={styles.cardRow}>
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={styles.card}
                draggable={!isPublished}
                onDragStart={(e) => handleDragStart(e, shift)}
                onDragEnd={handleDragEnd}
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

      {/* Create modal */}
      {positions && days && (
        <CreateHouseShiftModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          positions={positions}
          days={days}
        />
      )}
    </div>
  );
}
