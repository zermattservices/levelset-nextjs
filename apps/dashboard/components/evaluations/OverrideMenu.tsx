import * as React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
  fontFamily,
} from '@/components/forms/dialogStyles';

export interface OverrideMenuProps {
  ruleId: string;
  employeeId: string;
  periodStart: string;
  onOverrideCreated: () => void;
}

type DialogMode = 'skip' | 'defer' | null;

export function OverrideMenu({
  ruleId,
  employeeId,
  periodStart,
  onOverrideCreated,
}: OverrideMenuProps) {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [skipReason, setSkipReason] = React.useState('');
  const [deferDate, setDeferDate] = React.useState<Date | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleMenuOpen(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }

  function handleMenuClose() {
    setMenuAnchor(null);
  }

  function openSkipDialog() {
    handleMenuClose();
    setSkipReason('');
    setError(null);
    setDialogMode('skip');
  }

  function openDeferDialog() {
    handleMenuClose();
    setDeferDate(null);
    setError(null);
    setDialogMode('defer');
  }

  function handleDialogClose() {
    if (submitting) return;
    setDialogMode(null);
    setError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const { createSupabaseClient } = await import('@/util/supabase/component');
      const supabase = createSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body: Record<string, unknown> = {
        rule_id: ruleId,
        employee_id: employeeId,
        period_start: periodStart,
        override_type: dialogMode,
      };

      if (dialogMode === 'skip' && skipReason.trim()) {
        body.reason = skipReason.trim();
      }

      if (dialogMode === 'defer') {
        if (!deferDate) {
          setError('Please select a defer date.');
          setSubmitting(false);
          return;
        }
        body.defer_until = deferDate.toISOString().split('T')[0];
      }

      const res = await fetch('/api/evaluations/overrides', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create override');
      }

      setDialogMode(null);
      onOverrideCreated();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          color: 'var(--ls-color-muted)',
          '&:hover': { color: 'var(--ls-color-neutral-soft-foreground)' },
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            fontFamily,
            borderRadius: 2,
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--ls-color-muted-border)',
            minWidth: 180,
          },
        }}
      >
        <MenuItem
          onClick={openSkipDialog}
          sx={{ fontFamily, fontSize: 13, py: 1, px: 2 }}
        >
          Skip this period
        </MenuItem>
        <MenuItem
          onClick={openDeferDialog}
          sx={{ fontFamily, fontSize: 13, py: 1, px: 2 }}
        >
          Defer
        </MenuItem>
      </Menu>

      {/* Skip dialog */}
      <Dialog
        open={dialogMode === 'skip'}
        onClose={handleDialogClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={dialogTitleSx}>
          <span>Skip this period</span>
          <IconButton
            onClick={handleDialogClose}
            size="small"
            disabled={submitting}
            sx={{ color: 'var(--ls-color-muted)' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={dialogContentSx}>
          <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
            This evaluation will be skipped for the current period. You can optionally provide a reason.
          </Typography>

          <TextField
            label="Reason (optional)"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
            disabled={submitting}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily,
                fontSize: 14,
                borderRadius: 2,
                '&:hover fieldset': { borderColor: 'var(--ls-color-brand)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--ls-color-brand)' },
              },
              '& .MuiInputLabel-root': { fontFamily, fontSize: 14 },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--ls-color-brand)' },
            }}
          />

          {error && (
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
              {error}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={dialogActionsSx}>
          <Button onClick={handleDialogClose} disabled={submitting} sx={cancelButtonSx}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={primaryButtonSx}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {submitting ? 'Skipping...' : 'Skip period'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Defer dialog */}
      <Dialog
        open={dialogMode === 'defer'}
        onClose={handleDialogClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={dialogTitleSx}>
          <span>Defer evaluation</span>
          <IconButton
            onClick={handleDialogClose}
            size="small"
            disabled={submitting}
            sx={{ color: 'var(--ls-color-muted)' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={dialogContentSx}>
          <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
            Choose a date to defer this evaluation to. The evaluation will become due on that date.
          </Typography>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Defer until"
              value={deferDate}
              onChange={(val) => setDeferDate(val)}
              disabled={submitting}
              enableAccessibleFieldDOMStructure={false}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      fontFamily,
                      fontSize: 14,
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: 'var(--ls-color-brand)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--ls-color-brand)' },
                    },
                    '& .MuiInputLabel-root': { fontFamily, fontSize: 14 },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--ls-color-brand)' },
                  },
                },
                openPickerButton: {
                  sx: {
                    color: 'var(--ls-color-brand)',
                    '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.08)' },
                  },
                },
                popper: {
                  sx: {
                    '& .MuiPaper-root': { fontFamily },
                    '& .MuiPickersDay-root': {
                      fontFamily,
                      fontSize: 11,
                      '&.Mui-selected': {
                        backgroundColor: 'var(--ls-color-brand) !important',
                        color: 'var(--ls-color-bg-container) !important',
                      },
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>

          {error && (
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
              {error}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={dialogActionsSx}>
          <Button onClick={handleDialogClose} disabled={submitting} sx={cancelButtonSx}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !deferDate}
            sx={primaryButtonSx}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {submitting ? 'Deferring...' : 'Defer evaluation'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
