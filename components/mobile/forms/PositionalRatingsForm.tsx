import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Alert,
  Box,
  CircularProgress,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useMobilePortal } from '../MobilePortalContext';
import { useTranslation } from 'react-i18next';
import { useTranslatedContent } from '@/hooks/useTranslatedContent';
import type { FormControlCallbacks } from '../types';

// Rating options will be translated in component using useTranslation
const RATING_OPTIONS: Array<{ labelKey: string; value: RatingValue; color: string }> = [
  { labelKey: 'ratings.ratingLabels.notYet', value: 1, color: '#b91c1c' },
  { labelKey: 'ratings.ratingLabels.onTheRise', value: 2, color: '#f59e0b' },
  { labelKey: 'ratings.ratingLabels.crushingIt', value: 3, color: '#31664a' },
];

type RatingValue = 1 | 2 | 3;

interface EmployeeOption {
  id: string;
  name: string;
  role: string | null;
}

interface PositionOption {
  name: string;
  name_es?: string | null;
  zone: 'FOH' | 'BOH';
}

interface PositionalDataResponse {
  employees: EmployeeOption[];
  leaders: EmployeeOption[];
  positions: PositionOption[];
  rolePermissions?: Record<string, string[]>;
}

interface LabelsResponse {
  labels: string[];
  labels_es?: string[];
}

interface PositionalRatingsFormProps {
  controls: FormControlCallbacks;
}

export function PositionalRatingsForm({ controls }: PositionalRatingsFormProps) {
  const { token } = useMobilePortal();
  const { t } = useTranslation('forms');
  const { translate, language } = useTranslatedContent();

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [labelsError, setLabelsError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [leaders, setLeaders] = React.useState<EmployeeOption[]>([]);
  const [positions, setPositions] = React.useState<PositionOption[]>([]);
  const [rolePermissions, setRolePermissions] = React.useState<Record<string, string[]>>({});

  const [selectedLeader, setSelectedLeader] = React.useState('');
  const [selectedEmployee, setSelectedEmployee] = React.useState('');
  const [selectedPosition, setSelectedPosition] = React.useState('');
  const [labels, setLabels] = React.useState<string[]>([]);
  const [ratings, setRatings] = React.useState<Array<RatingValue | null>>([]);

  const [dirty, setDirty] = React.useState(false);

  const markDirty = React.useCallback(() => {
    if (!dirty) {
      setDirty(true);
      controls.setDirty(true);
    }
  }, [controls, dirty]);

  const resetDirty = React.useCallback(() => {
    setDirty(false);
    controls.setDirty(false);
  }, [controls]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadData() {
      controls.setSubmitDisabled(true);
      controls.setSubmitHandler(() => {});
      resetDirty();
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/mobile/${encodeURIComponent(token)}/positional-data`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: 'Failed to load data' }));
          throw new Error(payload?.error ?? 'Failed to load data');
        }
        const payload = (await response.json()) as PositionalDataResponse;
        if (!cancelled) {
          setEmployees(payload.employees ?? []);
          const leaderOptions = (payload.leaders ?? []).length
            ? payload.leaders
            : payload.employees ?? [];
          setLeaders(leaderOptions);
          setPositions((payload.positions ?? []).map((item) => ({ ...item })));
          setRolePermissions(payload.rolePermissions ?? {});
          setSelectedLeader('');
          setSelectedEmployee('');
          setSelectedPosition('');
          setLabels([]);
          setRatings([]);
          controls.setSubmitDisabled(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message ?? 'Unable to load form data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [controls, resetDirty, token]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLabels(position: string) {
      controls.setSubmitDisabled(true);
      setLabelsError(null);
      setLabels([]);
      setRatings([]);
      try {
        const response = await fetch(
          `/api/mobile/${encodeURIComponent(token)}/position-labels?position=${encodeURIComponent(position)}`
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: 'Failed to load labels' }));
          throw new Error(payload?.error ?? 'Failed to load labels');
        }
        const payload = (await response.json()) as LabelsResponse;
        if (!cancelled) {
          // Use translated labels based on current language
          const fetchedLabels = language === 'es' && payload.labels_es && payload.labels_es.length > 0
            ? payload.labels_es
            : payload.labels ?? [];
          setLabels(fetchedLabels);
          setRatings(Array.from({ length: fetchedLabels.length }, () => null));
        }
      } catch (err: any) {
        if (!cancelled) {
          setLabelsError(err?.message ?? 'Unable to load position details');
          setLabels([]);
          setRatings([]);
        }
      }
    }

    if (!selectedPosition) {
      setLabels([]);
      setRatings([]);
      setLabelsError(null);
      return;
    }

    loadLabels(selectedPosition);

    return () => {
      cancelled = true;
    };
  }, [controls, selectedPosition, token, language]);

  const selectedEmployeeOption = React.useMemo(
    () => employees.find((item) => item.id === selectedEmployee),
    [employees, selectedEmployee]
  );

  const isComplete = React.useMemo(() => {
    if (!selectedLeader || !selectedEmployee || !selectedPosition) {
      return false;
    }
    if (labels.length === 0 || ratings.length !== labels.length) {
      return false;
    }
    return ratings.every((value): value is RatingValue => value === 1 || value === 2 || value === 3);
  }, [labels.length, ratings, selectedEmployee, selectedLeader, selectedPosition]);

  React.useEffect(() => {
    controls.setSubmitDisabled(!isComplete);
  }, [controls, isComplete]);

  const submit = React.useCallback(async () => {
    setSubmitError(null);
    const payload = {
      leaderId: selectedLeader,
      employeeId: selectedEmployee,
      position: selectedPosition,
      ratings: ratings.map((value) => value ?? 0),
    };

    const response = await fetch(`/api/mobile/${encodeURIComponent(token)}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = 'Failed to submit ratings.';
      try {
        const errorPayload = await response.json();
        if (errorPayload?.error) {
          message = errorPayload.error;
        }
      } catch (err) {
        // ignore JSON parse errors
      }
      setSubmitError(message);
      throw new Error(message);
    }

    const result = await response.json();
    
    // Calculate overall rating (average of the 5 ratings)
    const validRatings = ratings.filter((r) => r !== null && r !== undefined && r > 0);
    const overallRating = validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
      : null;
    
    resetDirty();
    controls.completeSubmission({
      form: 'ratings',
      employeeName: `Employee: ${result.employeeName ?? selectedEmployeeOption?.name ?? 'Team member'}`,
      detail: `${selectedPosition} • Positional ratings`,
      overallRating: overallRating ? Number(overallRating.toFixed(2)) : null,
    });
  }, [controls, ratings, resetDirty, selectedEmployee, selectedEmployeeOption?.name, selectedLeader, selectedPosition, token]);

  React.useEffect(() => {
    controls.setSubmitHandler(() => submit());
  }, [controls, submit]);

  const leaderOptions = leaders.length ? leaders : employees;

  // Get selected leader's role
  const selectedLeaderRole = React.useMemo(() => {
    const leader = leaderOptions.find(l => l.id === selectedLeader);
    return leader?.role ?? null;
  }, [leaderOptions, selectedLeader]);

  // Filter positions based on selected leader's role permissions
  const filteredPositions = React.useMemo(() => {
    // If no role permissions are configured, show all positions
    const hasPermissions = Object.keys(rolePermissions).length > 0;
    if (!hasPermissions || !selectedLeaderRole) {
      return positions;
    }

    // Get allowed positions for this role
    const allowedPositions = rolePermissions[selectedLeaderRole];
    if (!allowedPositions || allowedPositions.length === 0) {
      // If no permissions defined for this role, show all positions (fallback)
      return positions;
    }

    // Filter positions to only those allowed for this role
    return positions.filter(p => allowedPositions.includes(p.name));
  }, [positions, rolePermissions, selectedLeaderRole]);

  const positionsByZone = React.useMemo(() => {
    const grouped = new Map<'FOH' | 'BOH', PositionOption[]>();
    filteredPositions.forEach((option) => {
      const zone = option.zone ?? 'FOH';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)!.push(option);
    });
    const zoneOrder: Array<'FOH' | 'BOH'> = ['FOH', 'BOH'];
    return zoneOrder
      .map((zone) => ({
        zone,
        options: (grouped.get(zone) ?? []).slice().sort((a, b) => {
          // Sort by translated position name
          const aText = translate(a, 'name', a.name);
          const bText = translate(b, 'name', b.name);
          return aText.localeCompare(bText, undefined, { sensitivity: 'base' });
        }),
      }))
      .filter((group) => group.options.length > 0);
  }, [filteredPositions, language, translate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <CircularProgress color="inherit" size={32} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {loadError}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Autocomplete
          options={leaderOptions}
          disablePortal
          value={leaderOptions.find((option) => option.id === selectedLeader) ?? null}
          onChange={(_, option) => {
            setSelectedLeader(option?.id ?? '');
            // Clear position selection when leader changes (positions may be filtered)
            setSelectedPosition('');
            setLabels([]);
            setRatings([]);
            markDirty();
          }}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label={t('ratings.leader')} helperText={t('ratings.leaderHelper')} />
          )}
        />

        <Autocomplete
          options={employees}
          disablePortal
          value={employees.find((option) => option.id === selectedEmployee) ?? null}
          onChange={(_, option) => {
            setSelectedEmployee(option?.id ?? '');
            markDirty();
          }}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label={t('ratings.employee')} helperText={t('ratings.employeeHelper')} />
          )}
        />

        <TextField
          key={`position-select-${language}`}
          select
          SelectProps={{ native: true }}
          label={t('ratings.position')}
          value={selectedPosition}
          fullWidth
          onChange={(event) => {
            setSelectedPosition(event.target.value as string);
            markDirty();
          }}
          InputLabelProps={{ shrink: true }}
          helperText={t('ratings.positionHelper')}
        >
          <option value="">{t('ratings.selectPosition')}</option>
          {positionsByZone.map((group) => (
            <optgroup
              key={group.zone}
              label={group.zone === 'FOH' ? 'Front of House (FOH)' : 'Back of House (BOH)'}
              style={{ fontWeight: 700 }}
            >
              {group.options.map((option) => (
                <option key={option.name} value={option.name}>
                  {translate(option, 'name', option.name)}
                </option>
              ))}
            </optgroup>
          ))}
        </TextField>
      </Box>

      {labelsError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {labelsError}
        </Alert>
      )}

      {labels.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {labels.map((label, index) => (
            <Box
              key={label ?? index}
              sx={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                {label}
              </Typography>
              <RadioGroup
                row
                value={ratings[index] ?? ''}
                onChange={(event) => {
                  markDirty();
                  setRatings((prev) => {
                    const next = [...prev] as Array<RatingValue | null>;
                    next[index] = Number(event.target.value) as RatingValue;
                    return next;
                  });
                }}
                sx={{ justifyContent: 'space-between', columnGap: 1 }}
              >
                {RATING_OPTIONS.map((option) => (
                  <Box
                    key={option.value}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      flex: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                        color: option.color,
                        textAlign: 'center',
                      }}
                    >
                      {t(option.labelKey)}
                    </Typography>
                    <Radio
                      value={option.value}
                      sx={{
                        color: option.color,
                        '&.Mui-checked': {
                          color: option.color,
                        },
                        '& .MuiSvgIcon-root': {
                          fontSize: 26,
                        },
                      }}
                    />
                  </Box>
                ))}
              </RadioGroup>
            </Box>
          ))}
          
          {/* Feedback reminder card */}
          {selectedEmployeeOption && (
            <Box
              sx={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                {t('ratings.feedbackTitle')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#4b5563',
                }}
              >
                {(() => {
                  const firstName = selectedEmployeeOption.name.split(' ')[0];
                  const text = t('ratings.feedbackBody', { name: firstName });
                  const parts = text.split(firstName);
                  return parts.map((part, i) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 600,
                            color: '#31664a',
                          }}
                        >
                          {firstName}
                        </Box>
                      )}
                    </React.Fragment>
                  ));
                })()}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {submitError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}
    </Box>
  );
}

