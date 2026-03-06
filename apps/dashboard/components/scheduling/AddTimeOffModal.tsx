import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import sty from './AddTimeOffModal.module.css';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
  id: string;
  full_name: string;
}

interface AddTimeOffModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgId: string;
  locationId: string;
  employees: Employee[];
  getAccessToken: () => Promise<string | null>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toISOString(date: Date, time: Date | null, isAllDay: boolean, isEnd: boolean): string {
  const d = new Date(date);
  if (isAllDay) {
    // All day: start at midnight, end at midnight next day
    d.setHours(0, 0, 0, 0);
    if (isEnd) {
      d.setDate(d.getDate() + 1);
    }
  } else if (time) {
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/*  MUI sx overrides for design system consistency                     */
/* ------------------------------------------------------------------ */

const dialogSx = {
  '& .MuiDialogTitle-root': {
    fontFamily: 'var(--ls-font-heading)',
    fontWeight: 700,
    fontSize: '17px',
    padding: '16px 24px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  '& .MuiDialogContent-root': {
    padding: '8px 24px 16px',
  },
  '& .MuiDialogActions-root': {
    padding: '8px 24px 16px',
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--ls-font-body)',
  },
  '& .MuiInputBase-root': {
    fontFamily: 'var(--ls-font-body)',
    fontSize: '14px',
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AddTimeOffModal({
  open,
  onClose,
  onSuccess,
  orgId,
  locationId,
  employees,
  getAccessToken,
}: AddTimeOffModalProps) {
  /* ── Form state ───────────────────────────────────────────── */
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isAllDay, setIsAllDay] = useState(true);
  const [status, setStatus] = useState<'pending' | 'approved'>('pending');
  const [isPaid, setIsPaid] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Reset form on open ───────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setSelectedEmployee(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setStartTime(null);
      setEndTime(null);
      setIsAllDay(true);
      setStatus('pending');
      setIsPaid(false);
      setNote('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  /* ── Sorted employee list ─────────────────────────────────── */
  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [employees]
  );

  /* ── Validation ───────────────────────────────────────────── */
  const canSubmit =
    !!selectedEmployee && !!startDate && !!endDate && (isAllDay || (!!startTime && !!endTime));

  /* ── Submit handler ───────────────────────────────────────── */
  async function handleSubmit() {
    if (!canSubmit || !startDate || !endDate) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = {
        intent: 'create_time_off',
        org_id: orgId,
        employee_id: selectedEmployee!.id,
        location_id: locationId,
        start_datetime: toISOString(startDate, startTime, isAllDay, false),
        end_datetime: toISOString(endDate, endTime, isAllDay, true),
        status,
        note: note.trim() || null,
        is_paid: isPaid,
      };

      const res = await fetch('/api/scheduling/approvals', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create time off request');
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create time off request:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle>
          Add Time Off
          <IconButton onClick={onClose} size="small" sx={{ color: 'var(--ls-color-muted)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <div className={sty.dialogContent}>
            {/* Employee select */}
            <div className={sty.employeeField}>
              <span className={sty.fieldLabel}>Employee</span>
              <Autocomplete
                options={sortedEmployees}
                getOptionLabel={(opt) => opt.full_name}
                value={selectedEmployee}
                onChange={(_, val) => setSelectedEmployee(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search employees..."
                    size="small"
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                size="small"
              />
            </div>

            {/* All day toggle */}
            <div className={sty.allDayRow}>
              <Switch
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                size="small"
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--ls-color-brand)' } }}
              />
              <span className={sty.allDayLabel}>All day</span>
            </div>

            {/* Start date/time */}
            <div>
              <span className={sty.fieldLabel}>Start</span>
              <div className={sty.dateTimeRow}>
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    // Auto-set end date if it's before start
                    if (val && endDate && val > endDate) setEndDate(val);
                  }}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                {!isAllDay && (
                  <TimePicker
                    value={startTime}
                    onChange={(val) => setStartTime(val)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                )}
              </div>
            </div>

            {/* End date/time */}
            <div>
              <span className={sty.fieldLabel}>End</span>
              <div className={sty.dateTimeRow}>
                <DatePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  minDate={startDate || undefined}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                {!isAllDay && (
                  <TimePicker
                    value={endTime}
                    onChange={(val) => setEndTime(val)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                )}
              </div>
            </div>

            {/* Status toggle */}
            <div>
              <span className={sty.fieldLabel}>Status</span>
              <div className={sty.statusToggle}>
                <button
                  type="button"
                  className={`${sty.statusBtn} ${status === 'pending' ? `${sty.statusBtnActive} ${sty.statusPending}` : ''}`}
                  onClick={() => setStatus('pending')}
                >
                  Pending
                </button>
                <button
                  type="button"
                  className={`${sty.statusBtn} ${status === 'approved' ? `${sty.statusBtnActive} ${sty.statusApproved}` : ''}`}
                  onClick={() => setStatus('approved')}
                >
                  Approved
                </button>
              </div>
            </div>

            {/* Paid toggle */}
            <div className={sty.paidRow}>
              <Switch
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                size="small"
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--ls-color-brand)' } }}
              />
              <span className={sty.paidLabel}>Paid time off</span>
            </div>

            {/* Note */}
            <div>
              <span className={sty.fieldLabel}>Note (optional)</span>
              <TextField
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for time off..."
                multiline
                rows={2}
                fullWidth
                size="small"
              />
            </div>

            {/* Error */}
            {error && <div className={sty.errorMsg}>{error}</div>}
          </div>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <button
            type="button"
            className={sty.submitBtn}
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? 'Submitting...' : 'Add Time Off'}
          </button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
