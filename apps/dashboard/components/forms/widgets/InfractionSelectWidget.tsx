import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", sans-serif';

interface InfractionRubricOption {
  id: string;
  action: string;
  action_es: string | null;
  points: number | null;
}

/**
 * Infraction select widget for RJSF forms.
 * Fetches org-level infraction rubric items and renders an Autocomplete.
 * Stores the rubric item ID as the field value.
 * Display format: "{points} - {action}" (matching AddInfractionModal).
 */
export function InfractionSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, formContext } = props;
  const auth = useAuth();
  const org_id = formContext?.orgId || auth.org_id;
  const [options, setOptions] = React.useState<InfractionRubricOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!org_id) return;
    let cancelled = false;

    const fetchRubric = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/forms/widget-data?type=infractions&org_id=${encodeURIComponent(org_id)}`);
        const json = await res.json();

        if (!cancelled && json.data) {
          setOptions(
            json.data.map((item: any) => ({
              id: item.id,
              action: item.action || 'Unknown',
              action_es: item.action_es ?? null,
              points: item.points ?? 0,
            }))
          );
        }
      } catch (err) {
        console.error('InfractionSelectWidget: load failed', err);
        if (!cancelled) setLoadError('Failed to load infraction types');
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
        getOptionLabel={(option) =>
          `${option.points ?? 0} - ${option.action}`
        }
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily, fontSize: 13 }}>
                {option.points ?? 0} - {option.action}
              </span>
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
