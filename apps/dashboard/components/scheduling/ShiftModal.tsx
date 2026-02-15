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
  startTime: string,
  endTime: string,
  breakMinutes: number,
): number | null {
  if (!employee?.calculated_pay) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
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
}: ShiftModalProps) {
  const isEdit = !!shift;

  const [date, setDate] = React.useState('');
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
        setDate(shift.shift_date);
        setStartTime(parseTimeToInput(shift.start_time));
        setEndTime(parseTimeToInput(shift.end_time));
        setBreakMin(shift.break_minutes || 0);
        setPositionId(shift.position_id ?? '');
        setEmployeeId(shift.assignment?.employee_id ?? '');
        setNotes(shift.notes ?? '');
        setIsHouseShift(shift.is_house_shift ?? false);
      } else {
        setDate(prefillDate ?? '');
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
  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const projectedCost = calculateCost(selectedEmployee, startTime, endTime, breakMin);

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

  const handleSave = async () => {
    if (!date || !startTime || !endTime) {
      setError('Date, start time, and end time are required.');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time.');
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
          shift_date: date,
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
          shift_date: date,
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
          {/* Date */}
          <div className={sty.field}>
            <LsDatePicker
              label="Date"
              value={date}
              onChange={(newDate) => {
                if (newDate) {
                  const y = newDate.getFullYear();
                  const m = String(newDate.getMonth() + 1).padStart(2, '0');
                  const d = String(newDate.getDate()).padStart(2, '0');
                  setDate(`${y}-${m}-${d}`);
                } else {
                  setDate('');
                }
              }}
              disabled={readOnly}
              fullWidth
            />
          </div>

          {/* Start / End time */}
          <div className={sty.row}>
            <div className={sty.field}>
              <label className={sty.label} htmlFor="shift-start">
                Start
              </label>
              <select
                id="shift-start"
                className={sty.timeSelect}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
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
                End
              </label>
              <select
                id="shift-end"
                className={sty.timeSelect}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={readOnly}
              >
                {TIME_OPTIONS.map((opt) => (
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
              onChange={(e) => setPositionId(e.target.value)}
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
