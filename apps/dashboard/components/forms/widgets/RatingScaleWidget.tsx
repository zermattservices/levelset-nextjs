import * as React from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';

const RATING_1_3_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Not Yet', color: '#b91c1c' },
  2: { label: 'On the Rise', color: '#f59e0b' },
  3: { label: 'Crushing It', color: 'var(--ls-color-brand)' },
};

const RATING_1_5_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '1 - Poor', color: 'var(--ls-color-destructive)' },
  2: { label: '2 - Below', color: '#E57373' },
  3: { label: '3 - Meets', color: 'var(--ls-color-warning)' },
  4: { label: '4 - Good', color: '#81C784' },
  5: { label: '5 - Excellent', color: 'var(--ls-color-success)' },
};

export function RatingScaleWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, schema, rawErrors } = props;

  const options: number[] = schema.enum as number[] || [];
  const isScale3 = options.length === 3 && options[0] === 1 && options[2] === 3;
  const labels = isScale3 ? RATING_1_3_LABELS : RATING_1_5_LABELS;

  return (
    <FormControl
      required={required}
      disabled={disabled || readonly}
      error={rawErrors && rawErrors.length > 0}
      component="fieldset"
      sx={{ width: '100%' }}
    >
      {label && (
        <FormLabel component="legend" sx={{ fontFamily, fontSize: 14, fontWeight: 500, mb: 1 }}>
          {label}
        </FormLabel>
      )}
      <RadioGroup
        row
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        sx={{ gap: '4px' }}
      >
        {options.map((opt) => {
          const info = labels[opt] || { label: String(opt), color: 'var(--ls-color-muted)' };
          const isSelected = value === opt;
          return (
            <FormControlLabel
              key={opt}
              value={opt}
              control={
                <Radio
                  size="small"
                  sx={{
                    color: 'var(--ls-color-muted-border)',
                    '&.Mui-checked': { color: info.color },
                  }}
                />
              }
              label={
                <span
                  style={{
                    fontFamily,
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? info.color : 'var(--ls-color-text-primary)',
                  }}
                >
                  {info.label}
                </span>
              }
            />
          );
        })}
      </RadioGroup>
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
