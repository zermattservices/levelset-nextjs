import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

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
  const [options, setOptions] = React.useState<DiscActionRubricOption[]>([]);
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

        // Fetch org-level disc_actions_rubric (location_id IS NULL)
        const { data } = await supabase
          .from('disc_actions_rubric')
          .select('id, action, points_threshold')
          .eq('org_id', appUser.org_id)
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
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
