import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';

interface PositionOption {
  id: string;
  name: string;
  zone: string | null;
}

/**
 * Position select widget for RJSF forms.
 * Fetches org_positions grouped by FOH/BOH zone.
 * Stores the position name as the field value.
 */
export function PositionSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const [positions, setPositions] = React.useState<PositionOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchPositions = async () => {
      setLoading(true);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          setLoadError('Not authenticated');
          return;
        }

        const { data: appUser } = await supabase
          .from('app_users')
          .select('org_id')
          .eq('auth_user_id', session.session.user.id)
          .limit(1)
          .single();

        if (!appUser?.org_id || cancelled) return;

        const { data } = await supabase
          .from('org_positions')
          .select('id, name, zone')
          .eq('org_id', appUser.org_id)
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
  }, []);

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
