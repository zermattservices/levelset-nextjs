import * as React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import { useMobilePortal } from '../MobilePortalContext';
import type { FormControlCallbacks } from '../types';

interface EmployeeOption {
  id: string;
  name: string;
  role: string | null;
}

interface PositionalDataResponse {
  employees: EmployeeOption[];
  leaders: EmployeeOption[];
  positions: string[];
}

interface LabelsResponse {
  labels: string[];
}

interface PositionalRatingsFormProps {
  controls: FormControlCallbacks;
}

export function PositionalRatingsForm({ controls }: PositionalRatingsFormProps) {
  const { token } = useMobilePortal();

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [labelsError, setLabelsError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [leaders, setLeaders] = React.useState<EmployeeOption[]>([]);
  const [positions, setPositions] = React.useState<string[]>([]);

  const [selectedLeader, setSelectedLeader] = React.useState('');
  const [selectedEmployee, setSelectedEmployee] = React.useState('');
  const [selectedPosition, setSelectedPosition] = React.useState('');
  const [labels, setLabels] = React.useState<string[]>([]);
  const [ratings, setRatings] = React.useState<number[]>([]);

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
          setPositions(payload.positions ?? []);
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
          const fetchedLabels = payload.labels ?? [];
          setLabels(fetchedLabels);
          setRatings(Array.from({ length: fetchedLabels.length }, () => 0));
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
  }, [controls, selectedPosition, token]);

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
    return ratings.every((value) => value >= 1);
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
      ratings,
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
    resetDirty();
    controls.completeSubmission({
      form: 'ratings',
      employeeName: result.employeeName ?? selectedEmployeeOption?.name ?? 'Team member',
      detail: `${selectedPosition} • Positional ratings`,
    });
  }, [controls, ratings, resetDirty, selectedEmployee, selectedEmployeeOption?.name, selectedLeader, selectedPosition, token]);

  React.useEffect(() => {
    controls.setSubmitHandler(() => submit());
  }, [controls, submit]);

  const leaderOptions = leaders.length ? leaders : employees;

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
        <TextField
          select
          label="Leader name"
          value={selectedLeader}
          fullWidth
          onChange={(event) => {
            setSelectedLeader(event.target.value);
            markDirty();
          }}
          helperText="Who is submitting this rating?"
        >
          <MenuItem value="">Select leader</MenuItem>
          {leaderOptions.map((leader) => (
            <MenuItem key={leader.id} value={leader.id}>
              {leader.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Team member"
          value={selectedEmployee}
          fullWidth
          onChange={(event) => {
            setSelectedEmployee(event.target.value);
            markDirty();
          }}
          helperText="Who is being evaluated?"
        >
          <MenuItem value="">Select team member</MenuItem>
          {employees.map((employee) => (
            <MenuItem key={employee.id} value={employee.id}>
              {employee.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Position"
          value={selectedPosition}
          fullWidth
          onChange={(event) => {
            setSelectedPosition(event.target.value);
            markDirty();
          }}
          helperText="Which role are you rating them for?"
        >
          <MenuItem value="">Select position</MenuItem>
          {positions.map((position) => (
            <MenuItem key={position} value={position}>
              {position}
            </MenuItem>
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
                gap: 1,
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
                Big 5 #{index + 1}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  color: '#4b5563',
                }}
              >
                {label}
              </Typography>
              <Rating
                value={ratings[index] || null}
                onChange={(_event, value) => {
                  markDirty();
                  setRatings((prev) => {
                    const next = [...prev];
                    next[index] = value ?? 0;
                    return next;
                  });
                }}
                max={5}
                size="large"
              />
            </Box>
          ))}
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

