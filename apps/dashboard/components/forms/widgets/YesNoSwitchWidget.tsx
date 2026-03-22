import * as React from 'react';
import { Box, Switch, Typography, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Yes/No switch widget for boolean fields.
 * Defaults to false (No) — both true and false are valid values.
 * Replaces the default checkbox so required booleans don't demand "true".
 */
export function YesNoSwitchWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const hasError = rawErrors && rawErrors.length > 0;

  // Ensure the value is always a boolean (never null/undefined)
  const checked = value === true;

  // On first render, if value is undefined, set it to false
  // so RJSF knows the field has a value (fixes required validation)
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (!didInit.current && value === undefined) {
      didInit.current = true;
      onChange(false);
    }
  }, [value, onChange]);

  return (
    <FormControl
      required={required}
      error={hasError}
      sx={{ width: '100%' }}
    >
      {label && (
        <Typography
          component="label"
          htmlFor={id}
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            color: hasError ? 'var(--ls-color-destructive-base)' : 'var(--ls-color-text-primary)',
            mb: 0.5,
          }}
        >
          {label}{required ? ' *' : ''}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 0.5,
        }}
      >
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: checked ? 400 : 600,
            color: checked ? 'var(--ls-color-muted)' : 'var(--ls-color-destructive-base)',
            minWidth: 24,
            userSelect: 'none',
          }}
        >
          No
        </Typography>
        <Switch
          id={id}
          checked={checked}
          onChange={(_, val) => onChange(val)}
          disabled={disabled || readonly}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: 'var(--ls-color-brand)',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: 'var(--ls-color-brand)',
            },
            '& .MuiSwitch-track': {
              backgroundColor: 'var(--ls-color-destructive-base)',
            },
          }}
        />
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: checked ? 600 : 400,
            color: checked ? 'var(--ls-color-brand)' : 'var(--ls-color-muted)',
            minWidth: 28,
            userSelect: 'none',
          }}
        >
          Yes
        </Typography>
      </Box>
      {hasError && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
