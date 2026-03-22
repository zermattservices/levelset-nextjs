import * as React from 'react';
import { FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { LsDatePicker } from '@/components/shared/LsDatePicker';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Date picker widget for RJSF forms.
 * Wraps the shared LsDatePicker (MUI X DatePicker with Levelset styling).
 *
 * Supports `defaultToCurrentDate` in ui:fieldMeta — when true, auto-fills
 * today's date if the field has no value on mount.
 */
export function DatePickerWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, uiSchema } = props;

  const meta = uiSchema?.['ui:fieldMeta'] || {};
  const defaultToCurrentDate = meta.defaultToCurrentDate === true;

  // Auto-fill today's date on mount if setting is enabled and no value exists
  const didAutoFill = React.useRef(false);
  React.useEffect(() => {
    if (defaultToCurrentDate && !value && !didAutoFill.current) {
      didAutoFill.current = true;
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  }, [defaultToCurrentDate, value, onChange]);

  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange(undefined);
      return;
    }
    // Store as YYYY-MM-DD string to match JSON Schema format: 'date'
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <LsDatePicker
        label={`${label}${required ? ' *' : ''}`}
        value={value || null}
        onChange={handleChange}
        disabled={disabled || readonly}
        fullWidth
      />
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
