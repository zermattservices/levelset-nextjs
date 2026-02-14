import * as React from 'react';
import sty from './ShiftModal.module.css';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Shift, Position } from '@/lib/scheduling.types';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  calculated_pay?: number;
}

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  shift?: Shift | null;
  prefillDate?: string;
  prefillPositionId?: string;
  prefillEmployeeId?: string;
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
  }) => Promise<void>;
  onUpdate: (id: string, data: {
    shift_date?: string;
    start_time?: string;
    end_time?: string;
    position_id?: string | null;
    break_minutes?: number;
    notes?: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAssign: (shiftId: string, employeeId: string) => Promise<void>;
  onUnassign: (shiftId: string, employeeId: string) => Promise<void>;
}

function parseTimeToInput(time?: string): string {
  if (!time) return '09:00';
  return time.slice(0, 5);
}

function calculateCost(employee: Employee | undefined, startTime: string, endTime: string, breakMinutes: number): number | null {
  if (!employee?.calculated_pay) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const netHours = Math.max(0, (endMin - startMin) / 60 - breakMinutes / 60);
  return Math.round(employee.calculated_pay * netHours * 100) / 100;
}

export function ShiftModal({
  open, onClose, shift, prefillDate, prefillPositionId, prefillEmployeeId,
  positions, employees, isPublished,
  onSave, onUpdate, onDelete, onAssign, onUnassign,
}: ShiftModalProps) {
  const isEdit = !!shift;

  const [date, setDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [breakMin, setBreakMin] = React.useState(0);
  const [positionId, setPositionId] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  // Reset form when shift/open changes
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
      } else {
        setDate(prefillDate ?? '');
        setStartTime('09:00');
        setEndTime('17:00');
        setBreakMin(0);
        setPositionId(prefillPositionId ?? '');
        setEmployeeId(prefillEmployeeId ?? '');
        setNotes('');
      }
      setError('');
      setEmployeeSearch('');
    }
  }, [open, shift, prefillDate, prefillPositionId, prefillEmployeeId]);

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const projectedCost = calculateCost(selectedEmployee, startTime, endTime, breakMin);

  const filteredEmployees = React.useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((e) =>
      e.full_name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q),
    );
  }, [employees, employeeSearch]);

  const handleSave = async () => {
    if (!date || !startTime || !endTime) {
      setError('Date, start time, and end time are required.');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEdit && shift) {
        // Update shift fields
        await onUpdate(shift.id, {
          shift_date: date,
          start_time: startTime,
          end_time: endTime,
          position_id: positionId || null,
          break_minutes: breakMin,
          notes: notes || null,
        });

        // Handle employee assignment changes
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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 400, maxWidth: '100vw' } }}
    >
      <div className={sty.drawer}>
        {/* Header */}
        <div className={sty.header}>
          <h2 className={sty.title}>{isEdit ? 'Edit Shift' : 'New Shift'}</h2>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        {readOnly && (
          <div className={sty.readOnlyBanner}>
            Schedule is published. Unpublish to make edits.
          </div>
        )}

        {/* Form */}
        <div className={sty.form}>
          {/* Date */}
          <div className={sty.field}>
            <label className={sty.label}>Date</label>
            <input
              type="date"
              className={sty.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Start / End time */}
          <div className={sty.row}>
            <div className={sty.field}>
              <label className={sty.label}>Start</label>
              <input
                type="time"
                className={sty.input}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className={sty.field}>
              <label className={sty.label}>End</label>
              <input
                type="time"
                className={sty.input}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Break */}
          <div className={sty.field}>
            <label className={sty.label}>Break (minutes)</label>
            <input
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
            <label className={sty.label}>Position</label>
            <select
              className={sty.select}
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              disabled={readOnly}
            >
              <option value="">— No position —</option>
              {positions.map((p) => (
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
              className={sty.select}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={readOnly}
              size={Math.min(5, filteredEmployees.length + 1)}
            >
              <option value="">— Unassigned —</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} — {e.role}
                  {e.calculated_pay ? ` ($${e.calculated_pay.toFixed(2)}/hr)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Projected cost */}
          {selectedEmployee && (
            <div className={sty.costDisplay}>
              <span className={sty.costLabel}>Projected Cost</span>
              <span className={sty.costValue}>
                {projectedCost != null ? `$${projectedCost.toFixed(2)}` : 'N/A'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className={sty.field}>
            <label className={sty.label}>Notes</label>
            <textarea
              className={sty.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Error */}
        {error && <div className={sty.error}>{error}</div>}

        {/* Actions */}
        {!readOnly && (
          <div className={sty.actions}>
            {isEdit && (
              <button
                className={sty.deleteBtn}
                onClick={handleDelete}
                disabled={saving}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                Delete
              </button>
            )}
            <div className={sty.actionSpacer} />
            <button className={sty.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className={sty.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
