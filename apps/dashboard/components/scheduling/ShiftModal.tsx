import * as React from 'react';
import sty from './ShiftModal.module.css';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Shift, Position } from '@/lib/scheduling.types';
import { LsDatePicker } from '@/components/shared/LsDatePicker';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
  id: string;
  full_name: string;
  role: string;
  calculated_pay?: number;
  is_foh: boolean;
  is_boh: boolean;
}

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  shift?: Shift | null;
  prefillDate?: string;
  prefillPositionId?: string;
  prefillEmployeeId?: string;
  prefillStartTime?: string;
  prefillEndTime?: string;
  canViewPay?: boolean;
  positions: Position[];
  employees: Employee[];
  isPublished: boolean;
  onSave: (data: {
    shift_date: string;
    end_date?: string;
    start_time: string;
    end_time: string;
    position_id?: string;
    break_minutes: number;
    notes?: string;
    employee_id?: string;
    is_house_shift?: boolean;
  }) => Promise<void>;
  onUpdate: (id: string, data: {
    shift_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    position_id?: string | null;
    break_minutes?: number;
    notes?: string | null;
    is_house_shift?: boolean;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAssign: (shiftId: string, employeeId: string) => Promise<void>;
  onUnassign: (shiftId: string, employeeId: string) => Promise<void>;
  /** Called when position selection changes in the drawer, for live preview updates */
  onPositionChange?: (positionId: string) => void;
  /** Called when start/end time changes in the drawer, for live preview updates */
  onTimeChange?: (startTime: string, endTime: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseTimeToInput(time?: string): string {
  if (!time) return '09:00';
  return time.slice(0, 5);
}

function calculateCost(
  employee: Employee | undefined,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  breakMinutes: number,
): number | null {
  if (!employee?.calculated_pay) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  // Add 24h for each day difference between start and end date
  if (startDate && endDate && endDate > startDate) {
    const sd = new Date(startDate + 'T00:00:00');
    const ed = new Date(endDate + 'T00:00:00');
    const dayDiff = Math.round((ed.getTime() - sd.getTime()) / (24 * 60 * 60 * 1000));
    endMin += dayDiff * 24 * 60;
  } else if (endMin <= startMin) {
    endMin += 24 * 60; // fallback cross-day
  }
  const netHours = Math.max(0, (endMin - startMin) / 60 - breakMinutes / 60);
  return Math.round(employee.calculated_pay * netHours * 100) / 100;
}

function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

/**
 * Build end-time options.
 *
 * Same date  → 96 slots starting 15 min after startTime, wrapping past midnight
 *              with "(+1)" labels for next-day times.
 * Diff date  → Full 24h range (all 96 slots) labeled with "(+N)".
 *
 * Each option carries a `nextDay` flag so the onChange handler can
 * auto-bump endDate when a cross-midnight time is selected.
 */
function generateEndTimeOptions(
  startTime: string,
  startDate: string,
  endDate: string,
): { value: string; label: string; nextDay: boolean }[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const startMin = sh * 60 + sm;

  // Calculate day difference
  let dayDiff = 0;
  if (startDate && endDate && endDate > startDate) {
    const sd = new Date(startDate + 'T00:00:00');
    const ed = new Date(endDate + 'T00:00:00');
    dayDiff = Math.round((ed.getTime() - sd.getTime()) / (24 * 60 * 60 * 1000));
  }

  const options: { value: string; label: string; nextDay: boolean }[] = [];

  if (dayDiff === 0) {
    // Same date selected: 96 slots starting 15 min after startTime, wrapping with (+1)
    for (let i = 1; i <= 96; i++) {
      const totalMin = startMin + i * 15;
      const wrappedMin = totalMin % (24 * 60);
      const h = Math.floor(wrappedMin / 60);
      const m = wrappedMin % 60;
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
      const nextDay = totalMin >= 24 * 60;
      options.push({ value, label: nextDay ? `${label} (+1)` : label, nextDay });
    }
  } else {
    // Different date selected: full 24h range labeled with (+N)
    const suffix = ` (+${dayDiff})`;
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${displayHour}:${String(m).padStart(2, '0')} ${period}${suffix}`;
        options.push({ value, label, nextDay: false });
      }
    }
  }

  return options;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ShiftModal({
  open,
  onClose,
  shift,
  prefillDate,
  prefillPositionId,
  prefillEmployeeId,
  prefillStartTime,
  prefillEndTime,
  canViewPay,
  positions,
  employees,
  isPublished,
  onSave,
  onUpdate,
  onDelete,
  onAssign,
  onUnassign,
  onPositionChange,
  onTimeChange,
}: ShiftModalProps) {
  const isEdit = !!shift;

  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [breakMin, setBreakMin] = React.useState(0);
  const [positionId, setPositionId] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isHouseShift, setIsHouseShift] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  /* Reset form when shift / open changes */
  React.useEffect(() => {
    if (open) {
      if (shift) {
        setStartDate(shift.shift_date);
        setEndDate(shift.end_date || shift.shift_date);
        setStartTime(parseTimeToInput(shift.start_time));
        setEndTime(parseTimeToInput(shift.end_time));
        setBreakMin(shift.break_minutes || 0);
        setPositionId(shift.position_id ?? '');
        setEmployeeId(shift.assignment?.employee_id ?? '');
        setNotes(shift.notes ?? '');
        setIsHouseShift(shift.is_house_shift ?? false);
      } else {
        setStartDate(prefillDate ?? '');
        setEndDate(prefillDate ?? '');
        setStartTime(prefillStartTime || '09:00');
        setEndTime(prefillEndTime || '17:00');
        setBreakMin(0);
        setPositionId(prefillPositionId ?? '');
        setEmployeeId(prefillEmployeeId ?? '');
        setNotes('');
        setIsHouseShift(false);
      }
      setError('');
      setEmployeeSearch('');
    }
  }, [open, shift, prefillDate, prefillPositionId, prefillEmployeeId, prefillStartTime, prefillEndTime]);

  /* Derived values */
  const endTimeOptions = React.useMemo(
    () => generateEndTimeOptions(startTime, startDate, endDate),
    [startTime, startDate, endDate],
  );

  /* Snap endTime to nearest valid option when options change and current value is invalid */
  React.useEffect(() => {
    if (!endTimeOptions.length) return;
    const validValues = endTimeOptions.map((o) => o.value);
    if (!validValues.includes(endTime)) {
      // Default to first option
      setEndTime(validValues[0]);
      onTimeChange?.(startTime, validValues[0]);
    }
  }, [endTimeOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const projectedCost = calculateCost(selectedEmployee, startDate, endDate, startTime, endTime, breakMin);

  const filteredEmployees = React.useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q),
    );
  }, [employees, employeeSearch]);

  /* Filter positions based on selected employee's zone assignments */
  const zoneFilteredPositions = React.useMemo(() => {
    if (!employeeId) return positions;
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return positions;
    return positions.filter((p) => {
      if (p.zone === 'BOH' && !emp.is_boh) return false;
      if (p.zone === 'FOH' && !emp.is_foh) return false;
      return true;
    });
  }, [positions, employeeId, employees]);

  /* Clear position if it becomes invalid after employee zone filtering */
  React.useEffect(() => {
    if (positionId && zoneFilteredPositions.length > 0) {
      if (!zoneFilteredPositions.some((p) => p.id === positionId)) {
        setPositionId('');
      }
    }
  }, [zoneFilteredPositions, positionId]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  /** Keep endDate >= startDate (if user changes startDate past endDate, clamp) */
  React.useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const handleSave = async () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      setError('All date and time fields are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date.');
      return;
    }
    if (startTime === endTime && startDate === endDate) {
      setError('Start and end time cannot be the same on the same day.');
      return;
    }
    if (!positionId) {
      setError('A position is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEdit && shift) {
        await onUpdate(shift.id, {
          shift_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          position_id: positionId || null,
          break_minutes: breakMin,
          notes: notes || null,
          is_house_shift: isHouseShift,
        });

        const currentEmpId = shift.assignment?.employee_id;
        if (employeeId && employeeId !== currentEmpId) {
          if (currentEmpId) {
            await onUnassign(shift.id, currentEmpId);
          }
          await onAssign(shift.id, employeeId);
        } else if (!employeeId && currentEmpId) {
          await onUnassign(shift.id, currentEmpId);
        }
      } else {
        await onSave({
          shift_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          position_id: positionId || undefined,
          break_minutes: breakMin,
          notes: notes || undefined,
          employee_id: employeeId || undefined,
          is_house_shift: isHouseShift || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save shift.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shift) return;
    if (!window.confirm('Delete this shift? This cannot be undone.')) return;
    setSaving(true);
    try {
      await onDelete(shift.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete shift.');
    } finally {
      setSaving(false);
    }
  };

  const readOnly = isPublished && isEdit;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 420, maxWidth: '100vw' } }}
    >
      <div className={sty.drawer}>
        {/* ---------- Header ---------- */}
        <div className={sty.header}>
          <h2 className={sty.title}>{isEdit ? 'Edit Shift' : 'New Shift'}</h2>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        {readOnly && (
          <div className={sty.readOnlyBanner}>
            Schedule is published. Unpublish to make edits.
          </div>
        )}

        {/* ---------- Form ---------- */}
        <div className={sty.form}>
          {/* Dates row: Start Date + End Date */}
          <div className={sty.row}>
            <div className={sty.field}>
              <LsDatePicker
                label="Start Date"
                value={startDate}
                onChange={(newDate) => {
                  if (newDate) {
                    const y = newDate.getFullYear();
                    const m = String(newDate.getMonth() + 1).padStart(2, '0');
                    const d = String(newDate.getDate()).padStart(2, '0');
                    setStartDate(`${y}-${m}-${d}`);
                  } else {
                    setStartDate('');
                  }
                }}
                disabled={readOnly}
                fullWidth
              />
            </div>
            <div className={sty.field}>
              <LsDatePicker
                label="End Date"
                value={endDate}
                onChange={(newDate) => {
                  if (newDate) {
                    const y = newDate.getFullYear();
                    const m = String(newDate.getMonth() + 1).padStart(2, '0');
                    const d = String(newDate.getDate()).padStart(2, '0');
                    const val = `${y}-${m}-${d}`;
                    // Don't allow end date before start date
                    setEndDate(val < startDate ? startDate : val);
                  } else {
                    setEndDate(startDate);
                  }
                }}
                disabled={readOnly}
                fullWidth
              />
            </div>
          </div>

          {/* Times row: Start Time + End Time */}
          <div className={sty.row}>
            <div className={sty.field}>
              <label className={sty.label} htmlFor="shift-start">
                Start Time
              </label>
              <select
                id="shift-start"
                className={sty.timeSelect}
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); onTimeChange?.(e.target.value, endTime); }}
                disabled={readOnly}
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={sty.field}>
              <label className={sty.label} htmlFor="shift-end">
                End Time
              </label>
              <select
                id="shift-end"
                className={sty.timeSelect}
                value={endTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setEndTime(val);
                  onTimeChange?.(startTime, val);
                  // Auto-update endDate when selecting a (+1) next-day option
                  const selected = endTimeOptions.find((o) => o.value === val);
                  if (selected?.nextDay && startDate) {
                    const d = new Date(startDate + 'T00:00:00');
                    d.setDate(d.getDate() + 1);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setEndDate(`${y}-${m}-${day}`);
                  } else if (selected && !selected.nextDay && startDate && endDate !== startDate) {
                    // Only in same-day options mode (has nextDay flags): snap endDate back
                    const hasNextDayOptions = endTimeOptions.some((o) => o.nextDay);
                    if (hasNextDayOptions) {
                      setEndDate(startDate);
                    }
                  }
                }}
                disabled={readOnly}
              >
                {endTimeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Break */}
          <div className={sty.field}>
            <label className={sty.label} htmlFor="shift-break">
              Break (minutes)
            </label>
            <input
              id="shift-break"
              type="number"
              className={sty.input}
              value={breakMin}
              min={0}
              max={120}
              onChange={(e) => setBreakMin(parseInt(e.target.value, 10) || 0)}
              disabled={readOnly}
            />
          </div>

          {/* Position */}
          <div className={sty.field}>
            <label className={sty.label} htmlFor="shift-position">
              Position <span style={{ color: 'var(--ls-color-destructive)' }}>*</span>
            </label>
            <select
              id="shift-position"
              className={sty.select}
              value={positionId}
              onChange={(e) => { setPositionId(e.target.value); onPositionChange?.(e.target.value); }}
              disabled={readOnly}
            >
              <option value="">-- Select position --</option>
              {zoneFilteredPositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.zone} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div className={sty.field}>
            <label className={sty.label}>Assigned Employee</label>
            <input
              type="text"
              className={sty.searchInput}
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              disabled={readOnly}
            />
            <select
              className={sty.employeeSelect}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={readOnly}
              size={Math.min(5, filteredEmployees.length + 1)}
            >
              <option value="">-- Unassigned --</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} — {e.role}
                  {canViewPay && e.calculated_pay ? ` ($${e.calculated_pay.toFixed(2)}/hr)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Projected cost */}
          {canViewPay && selectedEmployee && (
            <div className={sty.costDisplay}>
              <span className={sty.costLabel}>Projected Cost</span>
              <span className={sty.costValue}>
                {projectedCost != null ? `$${projectedCost.toFixed(2)}` : 'N/A'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className={sty.field}>
            <label className={sty.label} htmlFor="shift-notes">
              Notes
            </label>
            <textarea
              id="shift-notes"
              className={sty.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              disabled={readOnly}
            />
          </div>

          {/* House Shift */}
          <label className={sty.checkboxRow}>
            <input
              type="checkbox"
              checked={isHouseShift}
              onChange={(e) => setIsHouseShift(e.target.checked)}
              disabled={readOnly}
            />
            <span className={sty.checkboxLabel}>Make available as house shift</span>
          </label>
        </div>

        {/* ---------- Error ---------- */}
        {error && <div className={sty.error}>{error}</div>}

        {/* ---------- Actions ---------- */}
        {!readOnly && (
          <div className={sty.actions}>
            {isEdit && (
              <button
                className={sty.deleteBtn}
                onClick={handleDelete}
                disabled={saving}
                type="button"
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                Delete
              </button>
            )}
            <div className={sty.actionSpacer} />
            <button
              className={sty.cancelBtn}
              onClick={onClose}
              disabled={saving}
              type="button"
            >
              Cancel
            </button>
            <button
              className={sty.saveBtn}
              onClick={handleSave}
              disabled={saving}
              type="button"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
