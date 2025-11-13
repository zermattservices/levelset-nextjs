import * as React from 'react';
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
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

  const selectedEmployeeOption = React.useMemo(
    () => employees.find((item) => item.id === selectedEmployee),
    [employees, selectedEmployee]
  );

  const selectedLeaderOption = React.useMemo(
    () => leaders.find((item) => item.id === selectedLeader) ?? employees.find((item) => item.id === selectedLeader),
    [employees, leaders, selectedLeader]
  );

  React.useEffect(() => {
    if (selectedInfraction) {
      const option = infractionOptions.find((item) => item.id === selectedInfraction);
      setPoints(option?.points ?? null);
    } else {
      setPoints(null);
    }
  }, [infractionOptions, selectedInfraction]);

  React.useEffect(() => {
    if (selectedLeaderOption) {
      setLeaderSignature(selectedLeaderOption.name);
    } else {
      setLeaderSignature('');
    }
  }, [selectedLeaderOption]);

  const isComplete = React.useMemo(() => {
    if (!selectedLeader || !selectedEmployee || !selectedInfraction) {
      return false;
    }
    if (!leaderSignature || leaderSignature.trim().length === 0) {
      return false;
    }
    if (acknowledged && (!teamSignature || teamSignature.trim().length === 0)) {
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
      employeeName: result.employeeName ?? selectedEmployeeOption?.name ?? 'Team member',
      detail: result.action ?? 'Discipline infraction recorded',
    });
  }, [acknowledged, controls, leaderSignature, resetDirty, selectedEmployee, selectedEmployeeOption?.name, selectedInfraction, selectedLeader, teamSignature, token]);

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
          helperText="Who is filing this infraction?"
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
          helperText="Who is involved?"
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
          label="Infraction"
          value={selectedInfraction}
          fullWidth
          onChange={(event) => {
            setSelectedInfraction(event.target.value);
            markDirty();
          }}
          helperText="What happened?"
        >
          <MenuItem value="">Select infraction</MenuItem>
          {infractionOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.action}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Points"
          value={points ?? 0}
          fullWidth
          InputProps={{ readOnly: true }}
          helperText="Automatically populated from the infraction rubric"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(event) => {
                setAcknowledged(event.target.checked);
                markDirty();
              }}
            />
          }
          label="Team member was present and acknowledged the infraction"
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
          placeholder="Full name"
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

