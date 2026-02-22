import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", sans-serif';

interface LeaderOption {
  id: string;
  full_name: string;
  role: string | null;
}

/**
 * Leader/manager select widget for RJSF forms.
 * Fetches leaders via /api/forms/widget-data?type=leaders with server-side role filtering.
 * Stores the employee ID as the field value.
 */
export function LeaderSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, formContext } = props;
  const auth = useAuth();
  const org_id = formContext?.orgId || auth.org_id;
  const location_id = formContext?.locationId || auth.location_id;
  const formType = formContext?.formType || 'custom';
  const [leaders, setLeaders] = React.useState<LeaderOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!org_id || !location_id) return;
    let cancelled = false;

    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'leaders',
          org_id,
          location_id,
          form_type: formType,
        });
        const res = await fetch(`/api/forms/widget-data?${params}`);
        const json = await res.json();

        if (!cancelled && json.data) {
          setLeaders(
            json.data.map((e: any) => ({
              id: e.id,
              full_name: e.full_name || 'Unnamed',
              role: e.role ?? null,
            }))
          );
        }
      } catch (err) {
        console.error('LeaderSelectWidget: load failed', err);
        if (!cancelled) setLoadError('Failed to load leaders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeaders();
    return () => { cancelled = true; };
  }, [org_id, location_id, formType]);

  const selectedOption = leaders.find((e) => e.id === value) || null;
  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <Autocomplete
        id={id}
        options={leaders}
        loading={loading}
        disabled={isDisabled}
        value={selectedOption}
        onChange={(_, option) => onChange(option?.id ?? undefined)}
        getOptionLabel={(option) => option.full_name}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily, fontSize: 13 }}>{option.full_name}</span>
              {option.role && (
                <span style={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
                  {option.role}
                </span>
              )}
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label || 'Leader'}
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
