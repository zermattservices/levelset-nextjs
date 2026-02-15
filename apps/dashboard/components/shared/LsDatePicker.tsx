'use client';

import * as React from 'react';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = 'var(--ls-color-brand)';

/* ------------------------------------------------------------------ */
/*  Internal styled TextField for the DatePicker slot                   */
/* ------------------------------------------------------------------ */

const CustomDateTextField = React.forwardRef((props: any, ref: any) => (
  <TextField
    {...props}
    ref={ref}
    size="small"
    sx={{
      '& .MuiInputBase-root': {
        fontFamily,
        fontSize: 14,
      },
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 14,
        padding: '10px 14px',
      },
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 12,
        color: 'var(--ls-color-muted)',
        '&.Mui-focused': { color: levelsetGreen },
      },
      '& .MuiInputBase-input.Mui-disabled': {
        color: 'var(--ls-color-disabled-text)',
        WebkitTextFillColor: 'var(--ls-color-disabled-text)',
        backgroundColor: 'var(--ls-color-neutral-foreground)',
      },
      '& .MuiOutlinedInput-root.Mui-disabled': {
        backgroundColor: 'var(--ls-color-neutral-foreground)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--ls-color-muted-border)',
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-muted-border)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-border)',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      '& .MuiIconButton-root': {
        padding: '6px',
        '& .MuiSvgIcon-root': { fontSize: '1rem' },
      },
      ...props.sx,
    }}
  />
));
CustomDateTextField.displayName = 'CustomDateTextField';

/* ------------------------------------------------------------------ */
/*  LsDatePicker                                                        */
/* ------------------------------------------------------------------ */

interface LsDatePickerProps {
  /** Field label */
  label?: string;
  /** Date value — accepts a Date object OR a 'YYYY-MM-DD' string */
  value: Date | string | null;
  /** Called with the new Date object (or null) */
  onChange: (value: Date | null) => void;
  /** Date display format (default: 'M/d/yyyy') */
  format?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Full width (default: false) */
  fullWidth?: boolean;
  /** Additional sx passed to the outer wrapper */
  sx?: Record<string, any>;
}

export function LsDatePicker({
  label,
  value,
  onChange,
  format = 'M/d/yyyy',
  disabled,
  fullWidth,
  sx,
}: LsDatePickerProps) {
  /* Convert string 'YYYY-MM-DD' to Date without timezone shift */
  const dateValue = React.useMemo(() => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [value]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label={label}
        value={dateValue}
        onChange={onChange}
        format={format}
        disabled={disabled}
        enableAccessibleFieldDOMStructure={false}
        slots={{ textField: CustomDateTextField }}
        slotProps={{
          textField: { fullWidth, sx },
          popper: {
            sx: {
              '& .MuiPaper-root': { fontFamily },
              '& .MuiPickersDay-root': {
                fontFamily,
                '&.Mui-selected': {
                  backgroundColor: `${levelsetGreen} !important`,
                  color: '#fff !important',
                },
                '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.04)' },
              },
              '& .MuiPickersCalendarHeader-label': { fontFamily, fontSize: 12 },
              '& .MuiDayCalendar-weekDayLabel': { fontFamily, fontSize: 10 },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}
