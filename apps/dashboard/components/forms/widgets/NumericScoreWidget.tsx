import * as React from 'react';
import { Box, TextField, Typography, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Numeric score widget for RJSF forms.
 * Renders as a card with title + number input with " / {maxValue}" suffix.
 */
export function NumericScoreWidget(props: WidgetProps) {
  const { value, required, disabled, readonly, onChange, label, schema, rawErrors } = props;

  const maxValue = schema.maximum ?? 10;
  const description = schema.description || '';

  return (
    <Box
      sx={{
        backgroundColor: 'var(--ls-color-bg-container, #fff)',
        borderRadius: '12px',
        border: '1px solid var(--ls-color-muted-border)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        opacity: disabled || readonly ? 0.6 : 1,
      }}
    >
      {/* Title + Description */}
      {label && (
        <Typography
          sx={{
            fontFamily,
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ls-color-neutral-soft-foreground)',
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: '#dc2626', ml: 0.5 }}>*</Box>
          )}
        </Typography>
      )}
      {description && (
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ls-color-muted)',
            lineHeight: 1.4,
            mt: -1,
          }}
        >
          {description}
        </Typography>
      )}

      {/* Score input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TextField
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : Number(e.target.value);
            onChange(val);
          }}
          size="small"
          disabled={disabled || readonly}
          inputProps={{
            min: 0,
            max: maxValue,
            step: 0.1,
            style: { fontFamily, fontSize: 14, textAlign: 'right', width: 80 },
          }}
          sx={{
            width: 100,
            '& .MuiOutlinedInput-root': {
              fontFamily,
              borderRadius: '8px',
            },
          }}
        />
        <Typography
          sx={{
            fontFamily,
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ls-color-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          / {maxValue}
        </Typography>
      </Box>

      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </Box>
  );
}
