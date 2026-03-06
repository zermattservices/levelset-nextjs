"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createSupabaseClient } from "@/util/supabase/component";
import type { DisciplinaryAction, Employee } from "@/lib/supabase.types";

export interface AddActionModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSave?: (action: DisciplinaryAction) => void;
  currentUserId?: string;
  locationId: string;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = 'var(--ls-color-brand)';

// Custom TextField matching RecordActionModal
const CustomTextField = React.forwardRef((props: any, ref: any) => (
  <TextField
    {...props}
    ref={ref}
    fullWidth
    size="small"
    sx={{
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 12,
        color: 'var(--ls-color-muted)',
        '&.Mui-focused': {
          color: levelsetGreen,
        },
      },
      '& .MuiInputBase-root': {
        fontFamily,
        fontSize: 14,
      },
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 14,
        padding: '10px 14px',
      },
      '& .MuiInputBase-input.Mui-disabled': {
        color: 'var(--ls-color-disabled-text)',
        WebkitTextFillColor: 'var(--ls-color-disabled-text)',
        backgroundColor: 'var(--ls-color-neutral-foreground)',
      },
      '& .MuiOutlinedInput-root.Mui-disabled': {
        backgroundColor: 'var(--ls-color-neutral-foreground)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--ls-color-muted-border)',
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-muted-border)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-border)',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      ...props.sx,
    }}
  />
));

// Custom DatePicker TextField
const CustomDateTextField = React.forwardRef((props: any, ref: any) => (
  <TextField
    {...props}
    ref={ref}
    size="small"
    sx={{
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 14,
        padding: '10px 14px',
      },
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 12,
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-muted-border)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-border)',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      ...props.sx,
    }}
  />
));

export function AddActionModal({
  open,
  employee,
  onClose,
  onSave,
  currentUserId,
  locationId,
  className = "",
}: AddActionModalProps) {
  const [actionDate, setActionDate] = React.useState<Date | null>(new Date());
  const [actingLeaderId, setActingLeaderId] = React.useState("");
  const [actingLeader, setActingLeader] = React.useState<Employee | null>(null);
  const [loadingLeader, setLoadingLeader] = React.useState(false);
  const [actionType, setActionType] = React.useState("");
  const [actionId, setActionId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [locationOrgId, setLocationOrgId] = React.useState<string | null>(null);
  const [discActionsRubricOptions, setDiscActionsRubricOptions] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [needsLeaderPicker, setNeedsLeaderPicker] = React.useState(false);
  const [locationLeaders, setLocationLeaders] = React.useState<Employee[]>([]);
  const supabase = createSupabaseClient();

  // Load initial data
  React.useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setActionDate(new Date());
      setActingLeaderId("");
      setActingLeader(null);
      setActionType("");
      setActionId("");
      setNotes("");
      setNeedsLeaderPicker(false);
      setLocationLeaders([]);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch location name
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .select('name, org_id')
          .eq('id', locationId)
          .single();
        
        if (!locError && locData) {
          setLocationName(locData.name);
          setLocationOrgId(locData.org_id ?? null);
        }

        // Fetch disc_actions_rubric options - first try org-level, then fallback to location-level
        let rubricData: any[] | null = null;
        
        // First, try org-level actions (location_id IS NULL)
        if (locData?.org_id) {
          const { data: orgRubricData, error: orgRubricError } = await supabase
            .from('disc_actions_rubric')
            .select('*')
            .eq('org_id', locData.org_id)
            .is('location_id', null)
            .order('points_threshold', { ascending: true });
          
          if (!orgRubricError && orgRubricData && orgRubricData.length > 0) {
            rubricData = orgRubricData;
          }
        }
        
        // Fallback to location-specific actions
        if (!rubricData || rubricData.length === 0) {
          const { data: locRubricData, error: locRubricError } = await supabase
            .from('disc_actions_rubric')
            .select('*')
            .eq('location_id', locationId)
            .order('points_threshold', { ascending: true });
          
          if (!locRubricError && locRubricData) {
            rubricData = locRubricData;
          }
        }
        
        if (rubricData) {
          setDiscActionsRubricOptions(rubricData);
        }

        // Fetch acting leader (current user)
        const resolvedOrgId = locData?.org_id ?? employee?.org_id ?? null;
        if (currentUserId) {
          setLoadingLeader(true);

          const { data: appUserData, error: appUserError } = await supabase
            .from('app_users')
            .select('*')
            .eq('auth_user_id', currentUserId)
            .maybeSingle();

          if (!appUserError && appUserData) {
            let employeeData: any = null;

            // Try by employee_id link
            if (appUserData.employee_id) {
              const { data } = await supabase
                .from('employees')
                .select('*')
                .eq('id', appUserData.employee_id)
                .maybeSingle();
              employeeData = data;
            }

            // Fallback: try matching by email
            if (!employeeData && appUserData.email && resolvedOrgId) {
              const { data } = await supabase
                .from('employees')
                .select('*')
                .eq('email', appUserData.email)
                .eq('org_id', resolvedOrgId)
                .eq('active', true)
                .maybeSingle();
              employeeData = data;
            }

            if (employeeData) {
              const employeeLike: Employee = {
                id: employeeData.id,
                full_name: employeeData.full_name || `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim() || 'Unknown',
                role: employeeData.role || 'User',
                org_id: employeeData.org_id,
                location_id: employeeData.location_id || locationId,
                active: employeeData.active ?? true,
              };
              setActingLeader(employeeLike);
              setActingLeaderId(employeeData.id);
              setNeedsLeaderPicker(false);
            } else {
              // Admin without employee record — show leader picker
              setActingLeader(null);
              setNeedsLeaderPicker(true);

              if (resolvedOrgId) {
                const { data: leaders } = await supabase
                  .from('employees')
                  .select('id, full_name, first_name, last_name, role, org_id, location_id, active, is_leader')
                  .eq('org_id', resolvedOrgId)
                  .eq('location_id', locationId)
                  .eq('active', true)
                  .eq('is_leader', true)
                  .order('full_name');
                setLocationLeaders(leaders || []);
              }
            }
          }
          setLoadingLeader(false);
        }
      } catch (err) {
        console.error('[AddActionModal] Error fetching data:', err);
        setLoadingLeader(false);
      }
    };

    fetchData();
  }, [open, locationId, currentUserId, supabase]);

  // Handle action type change
  const handleActionTypeChange = (value: string) => {
    setActionType(value);
    const rubricItem = discActionsRubricOptions.find(item => item.action === value);
    if (rubricItem) {
      setActionId(rubricItem.id);
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setSaving(true);

      const newAction: Partial<DisciplinaryAction> = {
        employee_id: employee.id,
        action_date: actionDate ? actionDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        acting_leader: actingLeaderId,
        action: actionType,
        action_id: actionId,
        notes: notes,
        org_id: locationOrgId ?? actingLeader?.org_id ?? employee?.org_id ?? null,
        location_id: locationId,
      };

      const { data, error } = await supabase
        .from('disc_actions')
        .insert(newAction)
        .select()
        .single();

      if (error) throw error;

      // Call onSave callback with new action
      if (onSave && data) {
        onSave(data as DisciplinaryAction);
      }

      onClose();
    } catch (err) {
      console.error('Error saving disciplinary action:', err);
      alert('Failed to save disciplinary action. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            fontFamily,
            width: "500px",
          },
        }}
        className={className}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px",
            borderBottom: "1px solid var(--ls-color-muted-border)",
            backgroundColor: "var(--ls-color-bg-container)",
          }}
        >
          <Typography
            sx={{
              fontFamily,
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--ls-color-text-primary)",
            }}
          >
            Record an action for{" "}
            <Typography
              component="span"
              sx={{
                color: levelsetGreen,
                fontWeight: 600,
              }}
            >
              {employee.full_name}
            </Typography>
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: "var(--ls-color-muted)",
              "&:hover": {
                backgroundColor: "var(--ls-color-muted-soft)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Content */}
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Location (disabled) */}
          <CustomTextField
            label="Location"
            value={locationName}
            disabled
          />

          {/* Acting Leader — dropdown for admins, disabled field for linked users */}
          {needsLeaderPicker ? (
            <Autocomplete
              options={locationLeaders}
              getOptionLabel={(option: Employee) => option.full_name || ''}
              value={actingLeader}
              onChange={(_e, newValue) => {
                setActingLeader(newValue);
                setActingLeaderId(newValue?.id || '');
              }}
              isOptionEqualToValue={(option: Employee, value: Employee) => option.id === value.id}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Acting Leader"
                  placeholder="Select a leader..."
                />
              )}
              size="small"
              sx={{
                '& .MuiAutocomplete-popupIndicator': { color: 'var(--ls-color-muted)' },
                '& .MuiAutocomplete-clearIndicator': { color: 'var(--ls-color-muted)' },
              }}
              slotProps={{
                paper: {
                  sx: { fontFamily, fontSize: 14 },
                },
              }}
            />
          ) : (
            <CustomTextField
              label="Acting Leader"
              value={loadingLeader ? "Loading..." : (actingLeader?.full_name || "Not available")}
              disabled
            />
          )}

          {/* Action Date */}
          <DatePicker
            label="Action Date"
            value={actionDate}
            onChange={(newValue) => setActionDate(newValue)}
            format="M/d/yyyy"
            enableAccessibleFieldDOMStructure={false}
            slots={{
              textField: CustomDateTextField,
            }}
            slotProps={{
              textField: {
                fullWidth: true,
              },
              popper: {
                sx: {
                  '& .MuiPaper-root': {
                    fontFamily,
                  },
                  '& .MuiTypography-root': {
                    fontFamily,
                    fontSize: 11,
                  },
                  '& .MuiPickersDay-root': {
                    fontFamily,
                    fontSize: 11,
                    '&.Mui-selected': {
                      backgroundColor: `${levelsetGreen} !important`,
                      color: 'var(--ls-color-bg-container) !important',
                      '&:hover': {
                        backgroundColor: `${levelsetGreen} !important`,
                      },
                      '&:focus': {
                        backgroundColor: `${levelsetGreen} !important`,
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(49, 102, 74, 0.04)',
                    },
                    '&:focus': {
                      backgroundColor: 'rgba(49, 102, 74, 0.12)',
                    },
                  },
                  '& .MuiPickersCalendarHeader-label': {
                    fontFamily,
                    fontSize: 12,
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    fontFamily,
                    fontSize: 10,
                  },
                  '& .MuiButtonBase-root': {
                    fontFamily,
                    fontSize: 11,
                    color: levelsetGreen,
                  },
                  '& .MuiIconButton-root': {
                    color: `${levelsetGreen} !important`,
                    '&:hover': {
                      backgroundColor: 'rgba(49, 102, 74, 0.04)',
                    },
                  },
                  '& .MuiPickersYear-yearButton': {
                    fontFamily,
                    fontSize: 12,
                    '&.Mui-selected': {
                      backgroundColor: `${levelsetGreen} !important`,
                      color: 'var(--ls-color-bg-container) !important',
                    },
                  },
                },
              },
            }}
          />

          {/* Action - Dropdown from disc_actions_rubric */}
          <FormControl fullWidth size="small">
            <InputLabel
              shrink
              sx={{
                fontFamily,
                fontSize: 12,
                color: 'var(--ls-color-muted)',
                '&.Mui-focused': {
                  color: levelsetGreen,
                },
              }}
            >
              Action
            </InputLabel>
            <Select
              value={actionType}
              onChange={(e) => handleActionTypeChange(e.target.value)}
              label="Action"
              notched
              sx={{
                fontFamily,
                fontSize: 14,
                '& .MuiOutlinedInput-input': {
                  padding: '10px 14px',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--ls-color-muted-border)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--ls-color-border)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: levelsetGreen,
                  borderWidth: '2px',
                },
              }}
            >
              {discActionsRubricOptions.map((item) => (
                <MenuItem key={item.id} value={item.action} sx={{ fontFamily, fontSize: 14 }}>
                  {item.points_threshold} - {item.action}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="Please include any information relevant to this disciplinary action..."
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              '& .MuiInputLabel-root': {
                fontFamily,
                fontSize: 12,
                color: 'var(--ls-color-muted)',
                '&.Mui-focused': {
                  color: levelsetGreen,
                },
              },
              '& .MuiInputBase-root': {
                fontFamily,
                fontSize: 14,
              },
              '& .MuiInputBase-input': {
                fontFamily,
                fontSize: 14,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--ls-color-muted-border)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--ls-color-border)',
              },
              '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: levelsetGreen,
                borderWidth: '2px',
              },
            }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 1 }}>
            <Button
              onClick={onClose}
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: "none",
                color: "var(--ls-color-muted)",
                borderRadius: '8px',
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !actionType}
              variant="contained"
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: "none",
                backgroundColor: levelsetGreen,
                borderRadius: '8px',
                "&:hover": {
                  backgroundColor: "var(--ls-color-brand-dark)",
                },
                "&:disabled": {
                  backgroundColor: "var(--ls-color-border)",
                  color: "var(--ls-color-disabled-text)",
                },
              }}
            >
              {saving ? "Saving..." : "Record Action"}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}

