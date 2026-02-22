import * as React from 'react';
import { Box, Radio, RadioGroup, FormHelperText, Typography } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const RATING_1_3_OPTIONS: Array<{ label: string; value: number; color: string }> = [
  { label: 'Not Yet', value: 1, color: '#b91c1c' },
  { label: 'On the Rise', value: 2, color: '#f59e0b' },
  { label: 'Crushing It', value: 3, color: 'var(--ls-color-brand)' },
];

const RATING_1_5_OPTIONS: Array<{ label: string; value: number; color: string }> = [
  { label: '1 - Poor', value: 1, color: 'var(--ls-color-destructive)' },
  { label: '2 - Below', value: 2, color: '#E57373' },
  { label: '3 - Meets', value: 3, color: 'var(--ls-color-warning)' },
  { label: '4 - Good', value: 4, color: '#81C784' },
  { label: '5 - Excellent', value: 5, color: 'var(--ls-color-success)' },
];

/**
 * Rating scale widget for RJSF forms.
 *
 * Renders as a card matching the PWA PositionalRatingsForm layout:
 * - Card container with border, rounded corners, background
 * - Bold title + optional description
 * - Horizontally distributed radio buttons with colored labels above
 */
export function RatingScaleWidget(props: WidgetProps) {
  const { value, required, disabled, readonly, onChange, label, schema, rawErrors, uiSchema } = props;

  const enumValues: number[] = (schema.enum as number[]) || [];
  const isScale3 = enumValues.length === 3 && enumValues[0] === 1 && enumValues[2] === 3;
  const ratingOptions = isScale3 ? RATING_1_3_OPTIONS : RATING_1_5_OPTIONS;

  // Description from schema or uiSchema fieldMeta
  const description = schema.description || uiSchema?.['ui:fieldMeta']?.description || '';

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {/* Radio group — labels above radios, evenly distributed */}
      <RadioGroup
        row
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        sx={{ justifyContent: 'space-between', columnGap: 1 }}
      >
        {ratingOptions.map((option) => (
          <Box
            key={option.value}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily,
                fontSize: 13,
                fontWeight: 700,
                color: option.color,
                textAlign: 'center',
              }}
            >
              {option.label}
            </Typography>
            <Radio
              value={option.value}
              disabled={disabled || readonly}
              sx={{
                color: option.color,
                '&.Mui-checked': {
                  color: option.color,
                },
                '& .MuiSvgIcon-root': {
                  fontSize: 26,
                },
              }}
            />
          </Box>
        ))}
      </RadioGroup>

      {/* Validation errors */}
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </Box>
  );
}
