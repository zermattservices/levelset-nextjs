import * as React from 'react';
import { Autocomplete, TextField, Typography, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface PositionOption {
  id: string;
  name: string;
  zone: string | null;
  description: string | null;
}

/**
 * Position select widget for RJSF forms.
 * Fetches org_positions grouped by FOH/BOH zone.
 * Shows position description when selected (matching PWA).
 * Stores the position name as the field value.
 */
export function PositionSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, formContext } = props;
  const auth = useAuth();
  const org_id = formContext?.orgId || auth.org_id;
  const [positions, setPositions] = React.useState<PositionOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!org_id) return;
    let cancelled = false;

    const fetchPositions = async () => {
      setLoading(true);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();

        const { data } = await supabase
          .from('org_positions')
          .select('id, name, zone, description')
          .eq('org_id', org_id)
          .eq('is_active', true)
          .eq('position_type', 'standard')
          .order('zone')
          .order('display_order');

        if (!cancelled && data) {
          setPositions(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              zone: p.zone ?? null,
              description: p.description ?? null,
            }))
          );
        }
      } catch (err) {
        console.error('PositionSelectWidget: load failed', err);
        if (!cancelled) setLoadError('Failed to load positions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPositions();
    return () => { cancelled = true; };
  }, [org_id]);

  const selectedOption = positions.find((p) => p.name === value) || null;
  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <Autocomplete
        id={id}
        options={positions}
        loading={loading}
        disabled={isDisabled}
        value={selectedOption}
        onChange={(_, option) => onChange(option?.name ?? undefined)}
        getOptionLabel={(option) => option.name}
        groupBy={(option) => option.zone || 'Other'}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <span style={{ fontFamily, fontSize: 13 }}>{option.name}</span>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label || 'Position'}
            required={required}
            error={rawErrors && rawErrors.length > 0}
            sx={{
              '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
              '& .MuiInputLabel-root': { fontFamily, fontSize: 14 },
            }}
          />
        )}
      />

      {/* Position description — matches PWA */}
      {selectedOption?.description && (
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ls-color-text-secondary)',
            backgroundColor: 'var(--ls-color-neutral-foreground)',
            borderRadius: '8px',
            padding: '12px 16px',
            lineHeight: 1.5,
            mt: 1,
          }}
        >
          {selectedOption.description}
        </Typography>
      )}

      {loadError && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {loadError}
        </FormHelperText>
      )}
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
