import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

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
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const [options, setOptions] = React.useState<InfractionRubricOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const fetchRubric = async () => {
      setLoading(true);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;

        // Get current user's org
        const { data: appUser } = await supabase
          .from('app_users')
          .select('org_id')
          .eq('auth_user_id', session.session!.user.id)
          .limit(1)
          .single();

        if (!appUser?.org_id || cancelled) return;

        // Fetch org-level infraction rubric (location_id IS NULL)
        const { data } = await supabase
          .from('infractions_rubric')
          .select('id, action, action_es, points')
          .eq('org_id', appUser.org_id)
          .is('location_id', null)
          .order('points', { ascending: true });

        if (!cancelled && data) {
          setOptions(
            data.map((item: any) => ({
              id: item.id,
              action: item.action || 'Unknown',
              action_es: item.action_es ?? null,
              points: item.points ?? 0,
            }))
          );
        }
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRubric();
    return () => { cancelled = true; };
  }, []);

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
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
