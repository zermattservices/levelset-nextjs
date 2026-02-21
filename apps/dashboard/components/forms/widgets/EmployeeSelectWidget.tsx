import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';

interface EmployeeOption {
  id: string;
  full_name: string;
  role: string | null;
}

/**
 * Employee select widget for RJSF forms.
 * Fetches active employees for the current org and renders an Autocomplete.
 * Stores the employee ID as the field value.
 */
export function EmployeeSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) {
          setLoadError('Not authenticated');
          return;
        }

        // Get current user's org employees
        const { data: appUser } = await supabase
          .from('app_users')
          .select('org_id')
          .eq('auth_user_id', session.session!.user.id)
          .limit(1)
          .single();

        if (!appUser?.org_id || cancelled) return;

        const { data } = await supabase
          .from('employees')
          .select('id, full_name, first_name, last_name, role')
          .eq('org_id', appUser.org_id)
          .eq('active', true)
          .order('full_name');

        if (!cancelled && data) {
          setEmployees(
            data.map((e: any) => ({
              id: e.id,
              full_name: e.full_name?.trim() || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unnamed',
              role: e.role ?? null,
            }))
          );
        }
      } catch (err) {
        console.error('EmployeeSelectWidget: load failed', err);
        if (!cancelled) setLoadError('Failed to load employees');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEmployees();
    return () => { cancelled = true; };
  }, []);

  const selectedOption = employees.find((e) => e.id === value) || null;
  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <Autocomplete
        id={id}
        options={employees}
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
