import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';

interface LeaderOption {
  id: string;
  full_name: string;
  role: string | null;
}

function isLeaderRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized.includes('lead') ||
    normalized.includes('manager') ||
    normalized.includes('director') ||
    normalized.includes('executive') ||
    normalized.includes('operator') ||
    normalized.includes('trainer') ||
    normalized.includes('owner')
  );
}

/**
 * Leader/manager select widget for RJSF forms.
 * Fetches employees and filters to those with leadership roles.
 * Falls back to all employees if no leaders found.
 * Stores the employee ID as the field value.
 */
export function LeaderSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const [leaders, setLeaders] = React.useState<LeaderOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return;

        const { data: appUser } = await supabase
          .from('app_users')
          .select('org_id')
          .eq('auth_user_id', session.session.user.id)
          .limit(1)
          .single();

        if (!appUser?.org_id || cancelled) return;

        const { data } = await supabase
          .from('employees')
          .select('id, full_name, first_name, last_name, role, is_leader')
          .eq('org_id', appUser.org_id)
          .eq('active', true)
          .order('full_name');

        if (!cancelled && data) {
          const all = data.map((e: any) => ({
            id: e.id,
            full_name: e.full_name?.trim() || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unnamed',
            role: e.role ?? null,
            isLeader: e.is_leader || isLeaderRole(e.role),
          }));

          const leaderList = all.filter((e) => e.isLeader);
          setLeaders(leaderList.length > 0 ? leaderList : all);
        }
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeaders();
    return () => { cancelled = true; };
  }, []);

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
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
