import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
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

interface InfractionOption {
  id: string;
  action: string;
  points: number;
}

interface InfractionDataResponse {
  employees: EmployeeOption[];
  leaders: EmployeeOption[];
  infractions: InfractionOption[];
}

interface DisciplineInfractionFormProps {
  controls: FormControlCallbacks;
}

export function DisciplineInfractionForm({ controls }: DisciplineInfractionFormProps) {
  const { token } = useMobilePortal();

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [leaders, setLeaders] = React.useState<EmployeeOption[]>([]);
  const [infractionOptions, setInfractionOptions] = React.useState<InfractionOption[]>([]);

  const [selectedLeader, setSelectedLeader] = React.useState('');
  const [selectedEmployee, setSelectedEmployee] = React.useState('');
  const [selectedInfraction, setSelectedInfraction] = React.useState('');
  const [points, setPoints] = React.useState<number | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [teamSignature, setTeamSignature] = React.useState('');
  const [leaderSignature, setLeaderSignature] = React.useState('');

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
        const response = await fetch(`/api/mobile/${encodeURIComponent(token)}/infraction-data`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: 'Failed to load data' }));
          throw new Error(payload?.error ?? 'Failed to load data');
        }
        const payload = (await response.json()) as InfractionDataResponse;
        if (!cancelled) {
          setEmployees(payload.employees ?? []);
          const leaderOptions = (payload.leaders ?? []).length
            ? payload.leaders
            : payload.employees ?? [];
          setLeaders(leaderOptions);
          setInfractionOptions(payload.infractions ?? []);
          setSelectedLeader('');
          setSelectedEmployee('');
          setSelectedInfraction('');
          setPoints(null);
          setAcknowledged(false);
          setTeamSignature('');
          setLeaderSignature('');
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

  const leaderOptions = React.useMemo(() => (leaders.length ? leaders : employees), [leaders, employees]);

  const selectedEmployeeOption = React.useMemo(
    () => employees.find((item) => item.id === selectedEmployee),
    [employees, selectedEmployee]
  );

  const selectedLeaderOption = React.useMemo(
    () => leaderOptions.find((item) => item.id === selectedLeader),
    [leaderOptions, selectedLeader]
  );

  const selectedInfractionOption = React.useMemo(
    () => infractionOptions.find((item) => item.id === selectedInfraction),
    [infractionOptions, selectedInfraction]
  );

  const infractionGroups = React.useMemo(() => {
    const byPoints = new Map<number, InfractionOption[]>();
    infractionOptions.forEach((option) => {
      const key = option.points ?? 0;
      if (!byPoints.has(key)) {
        byPoints.set(key, []);
      }
      byPoints.get(key)!.push(option);
    });
    const sortedPoints = Array.from(byPoints.keys()).sort((a, b) => a - b);
    return sortedPoints.map((points) => ({
      points,
      options: byPoints
        .get(points)!
        .slice()
        .sort((a, b) => a.action.localeCompare(b.action, undefined, { sensitivity: 'base' })),
    }));
  }, [infractionOptions]);

  const formatPointsLabel = React.useCallback((value: number) => {
    const suffix = Math.abs(value) === 1 ? 'Point' : 'Points';
    return `${value} ${suffix}`;
  }, []);

  const getGroupStyles = React.useCallback((points: number) => {
    if (points < 0) {
      return {
        backgroundColor: '#e6f4ea',
        color: '#1f5132',
      };
    }
    if (points > 0) {
      return {
        backgroundColor: '#fee2e2',
        color: '#7f1d1d',
      };
    }
    return {
      backgroundColor: '#e5e7eb',
      color: '#374151',
    };
  }, []);

  React.useEffect(() => {
    if (selectedInfractionOption) {
      setPoints(selectedInfractionOption.points ?? null);
    } else {
      setPoints(null);
    }
  }, [selectedInfractionOption]);

  React.useEffect(() => {
    if (!selectedLeader) {
      setLeaderSignature('');
    }
  }, [selectedLeader]);

  const isComplete = React.useMemo(() => {
    if (!selectedLeader || !selectedEmployee || !selectedInfraction) {
      return false;
    }
    if (!leaderSignature.trim()) {
      return false;
    }
    if (acknowledged && !teamSignature.trim()) {
      return false;
    }
    return true;
  }, [acknowledged, leaderSignature, selectedEmployee, selectedInfraction, selectedLeader, teamSignature]);

  React.useEffect(() => {
    controls.setSubmitDisabled(!isComplete);
  }, [controls, isComplete]);

  const submit = React.useCallback(async () => {
    setSubmitError(null);
    const payload = {
      leaderId: selectedLeader,
      employeeId: selectedEmployee,
      infractionId: selectedInfraction,
      acknowledged,
      teamMemberSignature: teamSignature.trim() || null,
      leaderSignature: leaderSignature.trim(),
    };

    const response = await fetch(`/api/mobile/${encodeURIComponent(token)}/infractions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = 'Failed to submit infraction.';
      try {
        const errorPayload = await response.json();
        if (errorPayload?.error) {
          message = errorPayload.error;
        }
      } catch (err) {
        // ignore
      }
      setSubmitError(message);
      throw new Error(message);
    }

    const result = await response.json();
    resetDirty();
    controls.completeSubmission({
      form: 'infractions',
      employeeName: `Employee: ${selectedEmployeeOption?.name ?? 'Team member'}`,
      detail: result?.action ?? selectedInfractionOption?.action ?? 'Discipline infraction recorded',
      points:
        typeof result?.points === 'number'
          ? result.points
          : selectedInfractionOption?.points ?? 0,
    });
  }, [acknowledged, controls, leaderSignature, resetDirty, selectedEmployee, selectedEmployeeOption?.name, selectedInfraction, selectedInfractionOption?.action, selectedInfractionOption?.points, selectedLeader, teamSignature, token]);

  React.useEffect(() => {
    controls.setSubmitHandler(() => submit());
  }, [controls, submit]);

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
            markDirty();
          }}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label="Leader name" helperText="Who is filing this infraction?" />
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
            <TextField {...params} label="Team member" helperText="Who are you issuing an infraction for?" />
          )}
        />

        <TextField
          select
          SelectProps={{ native: true }}
          label="Infraction"
          value={selectedInfraction}
          fullWidth
          onChange={(event) => {
            setSelectedInfraction(event.target.value as string);
            markDirty();
          }}
          InputLabelProps={{ shrink: true }}
          helperText="What happened?"
        >
          <option value="">Select infraction</option>
          {infractionGroups.map((group) => {
            const styles = getGroupStyles(group.points);
            return (
              <optgroup
                key={group.points}
                label={formatPointsLabel(group.points)}
                style={{
                  backgroundColor: styles.backgroundColor,
                  color: styles.color,
                }}
              >
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.action}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </TextField>

        <TextField
          label="Points"
          value={points ?? 0}
          fullWidth
          InputProps={{ readOnly: true }}
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: '#f3f4f6',
            },
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(event) => {
                setAcknowledged(event.target.checked);
                markDirty();
              }}
              sx={{
                color: '#31664a',
                '&.Mui-checked': {
                  color: '#31664a',
                },
              }}
            />
          }
          label="Team Member has been made aware of this infraction"
          sx={{
            '& .MuiFormControlLabel-label': {
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
          }}
        />

        <TextField
          label="Team member signature"
          value={teamSignature}
          onChange={(event) => {
            setTeamSignature(event.target.value);
            markDirty();
          }}
          placeholder={selectedEmployeeOption?.name ?? 'Full name'}
          fullWidth
          helperText={acknowledged ? 'Required when the team member is present.' : 'Optional if the team member is not present.'}
        />

        <TextField
          label="Leader signature"
          value={leaderSignature}
          onChange={(event) => {
            setLeaderSignature(event.target.value);
            markDirty();
          }}
          placeholder={selectedLeaderOption?.name ?? 'Full name'}
          fullWidth
          helperText="Required to confirm this record."
        />
      </Box>

      {submitError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}
    </Box>
  );
}

