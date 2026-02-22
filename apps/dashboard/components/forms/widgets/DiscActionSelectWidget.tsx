import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", sans-serif';

interface DiscActionRubricOption {
  id: string;
  action: string;
  points_threshold: number | null;
}

/**
 * Discipline action select widget for RJSF forms.
 * Fetches org-level discipline action rubric items and renders an Autocomplete.
 * Stores the rubric item ID as the field value.
 */
export function DiscActionSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const { org_id } = useAuth();
  const [options, setOptions] = React.useState<DiscActionRubricOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!org_id) return;
    let cancelled = false;

    const fetchRubric = async () => {
      setLoading(true);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();

        // Fetch org-level disc_actions_rubric (location_id IS NULL)
        const { data } = await supabase
          .from('disc_actions_rubric')
          .select('id, action, points_threshold')
          .eq('org_id', org_id)
          .is('location_id', null)
          .order('points_threshold', { ascending: true });

        if (!cancelled && data) {
          setOptions(
            data.map((item: any) => ({
              id: item.id,
              action: item.action || 'Unknown',
              points_threshold: item.points_threshold ?? null,
            }))
          );
        }
      } catch (err) {
        console.error('DiscActionSelectWidget: load failed', err);
        if (!cancelled) setLoadError('Failed to load discipline actions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRubric();
    return () => { cancelled = true; };
  }, [org_id]);

  const selectedOption = options.find((o) => o.id === value) || null;
  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <Autocomplete
        id={id}
        options={options}
        loading={loading}
        disabled={isDisabled}
        value={selectedOption}
        onChange={(_, option) => onChange(option?.id ?? undefined)}
        getOptionLabel={(option) => option.action}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily, fontSize: 13 }}>{option.action}</span>
              {option.points_threshold != null && (
                <span style={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
                  At {option.points_threshold}+ points
                </span>
              )}
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={rawErrors && rawErrors.length > 0}
            sx={{
              '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
              '& .MuiInputLabel-root': { fontFamily, fontSize: 14 },
            }}
          />
        )}
        sx={{ '& .MuiAutocomplete-option': { fontFamily, fontSize: 13 } }}
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
