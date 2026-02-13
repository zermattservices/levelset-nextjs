import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { useMobilePortal } from '../MobilePortalContext';
import { PasswordModal } from '../PasswordModal';
import { SignatureCanvas } from '../SignatureCanvas';
import { useTranslation } from 'react-i18next';
import { useTranslatedContent } from '@/hooks/useTranslatedContent';
import type { FormControlCallbacks } from '../types';

interface EmployeeOption {
  id: string;
  name: string;
  role: string | null;
}

interface InfractionOption {
  id: string;
  action: string;
  action_es?: string | null;
  points: number;
  require_tm_signature?: boolean;
  require_leader_signature?: boolean;
}

interface InfractionDataResponse {
  employees: EmployeeOption[];
  leaders: EmployeeOption[];
  infractions: InfractionOption[];
  disciplinePassword?: string;
}

interface DisciplineInfractionFormProps {
  controls: FormControlCallbacks;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

const InfractionDateTextField = React.forwardRef(function InfractionDateTextField(
  props: React.ComponentProps<typeof TextField>,
  ref: React.Ref<HTMLInputElement>
) {
  return (
    <TextField
      {...props}
      ref={ref}
      fullWidth
      sx={{
        '& .MuiInputBase-root': {
          fontFamily,
          fontSize: 16,
        },
        '& .MuiInputLabel-root': {
          fontFamily,
          fontSize: 16,
        },
        ...props.sx,
      }}
    />
  );
});

export function DisciplineInfractionForm({ controls }: DisciplineInfractionFormProps) {
  const { token } = useMobilePortal();
  const { t } = useTranslation('forms');
  const { translate, language } = useTranslatedContent();

  const [passwordVerified, setPasswordVerified] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [disciplinePassword, setDisciplinePassword] = React.useState<string>('');

  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [leaders, setLeaders] = React.useState<EmployeeOption[]>([]);
  const [infractionOptions, setInfractionOptions] = React.useState<InfractionOption[]>([]);

  const [selectedLeader, setSelectedLeader] = React.useState('');
  const [selectedEmployee, setSelectedEmployee] = React.useState('');
  const [selectedInfraction, setSelectedInfraction] = React.useState('');
  const [infractionDate, setInfractionDate] = React.useState<Date | null>(new Date());
  const [points, setPoints] = React.useState<number | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [teamSignature, setTeamSignature] = React.useState('');
  const [leaderSignature, setLeaderSignature] = React.useState('');
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
          setDisciplinePassword(payload.disciplinePassword ?? '');
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
        .sort((a, b) => {
          // Sort by translated action text
          const aText = translate(a, 'action', a.action);
          const bText = translate(b, 'action', b.action);
          return aText.localeCompare(bText, undefined, { sensitivity: 'base' });
        }),
    }));
  }, [infractionOptions, language, translate]);

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

  // Determine if signatures are required based on selected infraction settings
  const requireTmSignature = selectedInfractionOption?.require_tm_signature ?? false;
  const requireLeaderSignature = selectedInfractionOption?.require_leader_signature ?? false;

  const isComplete = React.useMemo(() => {
    if (!selectedLeader || !selectedEmployee || !selectedInfraction) {
      return false;
    }
    if (!infractionDate) {
      return false;
    }
    // Leader signature is always required, but may be "required" by infraction setting
    if (!leaderSignature.trim()) {
      return false;
    }
    // Team member signature required if acknowledged OR if infraction requires it
    if ((acknowledged || requireTmSignature) && !teamSignature.trim()) {
      return false;
    }
    return true;
  }, [acknowledged, infractionDate, leaderSignature, requireTmSignature, selectedEmployee, selectedInfraction, selectedLeader, teamSignature]);

  React.useEffect(() => {
    controls.setSubmitDisabled(!isComplete);
  }, [controls, isComplete]);

  const submit = React.useCallback(async () => {
    setSubmitError(null);
    const payload = {
      leaderId: selectedLeader,
      employeeId: selectedEmployee,
      infractionId: selectedInfraction,
      infractionDate: infractionDate ? format(infractionDate, 'yyyy-MM-dd') : null,
      acknowledged,
      notes: notes.trim() || null,
      teamMemberSignature: teamSignature || null,
      leaderSignature: leaderSignature,
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

    // Upload attached files if any
    if (result?.infractionId && attachedFiles.length > 0) {
      for (const file of attachedFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('infraction_id', result.infractionId);
          await fetch(`/api/mobile/${encodeURIComponent(token)}/infraction-documents`, {
            method: 'POST',
            body: formData,
          });
        } catch (err) {
          console.warn('[DisciplineInfractionForm] File upload failed:', err);
          // Don't fail the whole submission
        }
      }
    }

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
  }, [acknowledged, attachedFiles, controls, infractionDate, leaderSignature, notes, resetDirty, selectedEmployee, selectedEmployeeOption?.name, selectedInfraction, selectedInfractionOption?.action, selectedInfractionOption?.points, selectedLeader, teamSignature, token]);

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

  const correctPassword = disciplinePassword || '';
  const showPasswordModal = !passwordVerified && correctPassword.length > 0;

  if (showPasswordModal) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PasswordModal
          open={true}
          onClose={() => {
            // Mark form as not dirty so drawer can close without confirmation
            controls.setDirty(false);
            // Signal cancellation to parent - this will close the drawer
            controls.completeSubmission({
              form: 'infractions',
              employeeName: '',
              detail: 'Password entry cancelled',
              points: 0,
            });
          }}
          onProceed={() => setPasswordVerified(true)}
          correctPassword={correctPassword}
        />
      </Box>
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
            <TextField {...params} label={t('infraction.leader')} helperText={t('infraction.leaderHelper')} />
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
            <TextField {...params} label={t('infraction.employee')} helperText={t('infraction.employeeHelper')} />
          )}
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={t('infraction.date')}
            value={infractionDate}
            onChange={(newValue) => {
              setInfractionDate(newValue);
              markDirty();
            }}
            format="M/d/yyyy"
            enableAccessibleFieldDOMStructure={false}
            slots={{
              textField: InfractionDateTextField,
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: t('infraction.dateHelper'),
              },
              popper: {
                sx: {
                  '& .MuiPaper-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersCalendarHeader-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersToolbar-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersDay-root': {
                    fontFamily,
                    fontSize: 11,
                    '&.Mui-selected': {
                      backgroundColor: `${levelsetGreen} !important`,
                      color: '#fff !important',
                    },
                  },
                },
              },
              desktopPaper: {
                sx: {
                  fontFamily,
                  '& *': {
                    fontFamily: 'inherit',
                  },
                  '& .MuiPickersCalendarHeader-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersToolbar-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersDay-root': {
                    fontFamily,
                    fontSize: 11,
                    '&.Mui-selected': {
                      backgroundColor: `${levelsetGreen} !important`,
                      color: '#fff !important',
                    },
                  },
                },
              },
              mobilePaper: {
                sx: {
                  fontFamily,
                  '& *': {
                    fontFamily: 'inherit',
                  },
                  '& .MuiPickersCalendarHeader-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersToolbar-root': {
                    fontFamily,
                    '& *': {
                      fontFamily: 'inherit',
                    },
                  },
                  '& .MuiPickersDay-root': {
                    fontFamily,
                    fontSize: 11,
                    '&.Mui-selected': {
                      backgroundColor: `${levelsetGreen} !important`,
                      color: '#fff !important',
                    },
                  },
                },
              },
            }}
          />
        </LocalizationProvider>

        <TextField
          key={`infraction-select-${language}`}
          select
          SelectProps={{ native: true }}
          label={t('infraction.infraction')}
          value={selectedInfraction}
          fullWidth
          onChange={(event) => {
            setSelectedInfraction(event.target.value as string);
            markDirty();
          }}
          InputLabelProps={{ shrink: true }}
          helperText={t('infraction.infractionHelper')}
        >
          <option value="">{t('infraction.selectInfraction')}</option>
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
                    {translate(option, 'action', option.action)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </TextField>

        <TextField
          label={t('infraction.points')}
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
          label={t('infraction.acknowledged')}
          sx={{
            '& .MuiFormControlLabel-label': {
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
          }}
        />

        <TextField
          label={t('infraction.notes', 'Notes')}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            markDirty();
          }}
          placeholder={t('infraction.notesPlaceholder', 'Additional details about the infraction (optional)')}
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          helperText={t('infraction.notesHelper', 'Optional: Add any relevant context or details')}
          sx={{
            '& .MuiInputBase-root': {
              fontFamily,
            },
            '& .MuiInputLabel-root': {
              fontFamily,
            },
            '& .MuiFormHelperText-root': {
              fontFamily,
            },
          }}
        />

        {/* File Attachments */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mb: '8px' }}>
            <AttachFileIcon sx={{ fontSize: 16, color: '#6b7280', transform: 'rotate(45deg)' }} />
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#374151' }}>
              {t('infraction.attachments', 'Attachments')}
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>
              ({attachedFiles.length}/5)
            </Typography>
          </Box>

          {/* Thumbnail Strip */}
          {attachedFiles.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                pb: '8px',
                mb: '8px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {attachedFiles.map((file, idx) => (
                <Box
                  key={`file-${idx}`}
                  sx={{
                    position: 'relative',
                    flexShrink: 0,
                    width: 72,
                    height: 72,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        p: '4px',
                      }}
                    >
                      <PictureAsPdfIcon sx={{ fontSize: 24, color: '#ef4444' }} />
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 8,
                          color: '#6b7280',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {file.name}
                      </Typography>
                    </Box>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => {
                      setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      width: 20,
                      height: 20,
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {attachedFiles.length < 5 && (
            <Button
              variant="outlined"
              startIcon={<AddAPhotoIcon />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: 'none',
                color: levelsetGreen,
                borderColor: levelsetGreen,
                borderRadius: '8px',
                py: '10px',
                '&:hover': {
                  borderColor: '#254d36',
                  backgroundColor: 'rgba(49,102,74,0.04)',
                },
              }}
            >
              {t('infraction.attachFile', 'Attach Photo or Document')}
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp,application/pdf"
            capture="environment"
            multiple
            onChange={(e) => {
              if (!e.target.files) return;
              const remaining = 5 - attachedFiles.length;
              const newFiles: File[] = [];
              for (let i = 0; i < Math.min(e.target.files.length, remaining); i++) {
                const file = e.target.files[i];
                if (file.size <= 10 * 1024 * 1024) {
                  newFiles.push(file);
                }
              }
              if (newFiles.length > 0) {
                setAttachedFiles((prev) => [...prev, ...newFiles]);
                markDirty();
              }
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            style={{ display: 'none' }}
          />
        </Box>

        <SignatureCanvas
          label={requireTmSignature ? `${t('infraction.teamSignature')} *` : t('infraction.teamSignature')}
          value={teamSignature}
          onSignatureChange={(dataUrl) => {
            setTeamSignature(dataUrl);
            markDirty();
          }}
          helperText={
            requireTmSignature
              ? t('infraction.teamSignatureRequired', 'Required for this infraction type')
              : acknowledged 
                ? t('infraction.teamSignatureHelperPresent') 
                : t('infraction.teamSignatureHelperAbsent')
          }
        />

        <SignatureCanvas
          label={requireLeaderSignature ? `${t('infraction.leaderSignature')} *` : t('infraction.leaderSignature')}
          value={leaderSignature}
          onSignatureChange={(dataUrl) => {
            setLeaderSignature(dataUrl);
            markDirty();
          }}
          helperText={
            requireLeaderSignature 
              ? t('infraction.leaderSignatureRequired', 'Required for this infraction type')
              : t('infraction.leaderSignatureHelper')
          }
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

