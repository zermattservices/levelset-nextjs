import * as React from 'react';
import { Autocomplete, TextField, Typography, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface DataOption {
  id: string;
  label: string;
  sublabel?: string;
  group?: string;
  description?: string;
}

/**
 * Unified data select widget for RJSF forms.
 * Fetches data based on the dataSource setting in fieldMeta.
 * Replaces: EmployeeSelectWidget, LeaderSelectWidget, PositionSelectWidget,
 *           InfractionSelectWidget, DiscActionSelectWidget.
 */
export function DataSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, formContext } = props;
  const auth = useAuth();
  const org_id = formContext?.orgId || auth.org_id;
  const location_id = formContext?.locationId || auth.location_id;
  const formType = formContext?.formType || 'custom';

  const meta = props.uiSchema?.['ui:fieldMeta'] || {};
  const dataSource = meta.dataSource || 'employees';
  const maxHierarchyLevel = meta.maxHierarchyLevel;

  const [options, setOptions] = React.useState<DataOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Determine what value is stored (ID vs name) based on data source
  const storesName = dataSource === 'positions';

  React.useEffect(() => {
    if (!org_id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const fetchData = async () => {
      try {
        let fetchedOptions: DataOption[] = [];

        if (dataSource === 'employees') {
          if (!location_id) { setLoading(false); return; }
          const res = await fetch(`/api/employees?location_id=${encodeURIComponent(location_id)}`);
          const json = await res.json();
          if (json.employees) {
            fetchedOptions = json.employees.map((e: any) => ({
              id: e.id,
              label: e.full_name?.trim() || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unnamed',
              sublabel: e.role ?? undefined,
            }));
          }
        } else if (dataSource === 'leaders') {
          if (!location_id) { setLoading(false); return; }
          const params = new URLSearchParams({
            type: 'leaders',
            org_id,
            location_id,
            form_type: formType,
          });
          if (maxHierarchyLevel !== undefined) {
            params.set('max_hierarchy', String(maxHierarchyLevel));
          }
          const res = await fetch(`/api/forms/widget-data?${params}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((e: any) => ({
              id: e.id,
              label: e.full_name || 'Unnamed',
              sublabel: e.role ?? undefined,
            }));
          }
        } else if (dataSource === 'positions') {
          const res = await fetch(`/api/forms/widget-data?type=positions&org_id=${encodeURIComponent(org_id)}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((p: any) => ({
              id: p.id,
              label: p.name,
              group: p.zone ?? undefined,
              description: p.description ?? undefined,
            }));
          }
        } else if (dataSource === 'infractions') {
          const res = await fetch(`/api/forms/widget-data?type=infractions&org_id=${encodeURIComponent(org_id)}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((item: any) => ({
              id: item.id,
              label: `${item.points ?? 0} - ${item.action || 'Unknown'}`,
            }));
          }
        } else if (dataSource === 'disc_actions') {
          const res = await fetch(`/api/forms/widget-data?type=disc_actions&org_id=${encodeURIComponent(org_id)}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((item: any) => ({
              id: item.id,
              label: item.action || 'Unknown',
              sublabel: item.points_threshold != null ? `At ${item.points_threshold}+ points` : undefined,
            }));
          }
        }

        if (!cancelled) setOptions(fetchedOptions);
      } catch (err) {
        console.error(`DataSelectWidget(${dataSource}): load failed`, err);
        if (!cancelled) setLoadError(`Failed to load ${dataSource}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [org_id, location_id, formType, dataSource, maxHierarchyLevel]);

  const selectedOption = React.useMemo(() => {
    if (!value) return null;
    if (storesName) {
      return options.find((o) => o.label === value) || null;
    }
    return options.find((o) => o.id === value) || null;
  }, [value, options, storesName]);

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
        onChange={(_, option) => {
          if (storesName) {
            onChange(option?.label ?? undefined);
          } else {
            onChange(option?.id ?? undefined);
          }
        }}
        getOptionLabel={(option) => option.label}
        groupBy={dataSource === 'positions' ? (option) => option.group || 'Other' : undefined}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily, fontSize: 13 }}>{option.label}</span>
              {option.sublabel && (
                <span style={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
                  {option.sublabel}
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

      {/* Position description */}
      {dataSource === 'positions' && selectedOption?.description && (
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
