"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  TextField,
  Button,
  Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee } from "@/lib/supabase.types";

export interface RecordActionModalProps {
  open: boolean;
  employee: Employee | null;
  recommendedAction: string;
  recommendedActionId: string;
  currentUser: Employee | null;
  currentUserId?: string; // Alternative: just the auth user ID
  onClose: () => void;
  onSuccess?: (employeeId: string) => void;
  locationId: string;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = 'var(--ls-color-brand)';

// Custom TextField matching PositionalRatings
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

// Custom DatePicker TextField - with date picker styling matching PositionalRatings
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
      '& .MuiIconButton-root': {
        padding: '6px',
        '& .MuiSvgIcon-root': {
          fontSize: '1rem',
        },
      },
      ...props.sx,
    }}
  />
));

/**
 * Attempt to resolve the current auth user to an employee record.
 * Returns the employee if found, or null if the user is an admin without an employee record.
 */
async function resolveAuthUserToEmployee(
  supabase: any,
  authUserId: string,
  orgId: string | null,
): Promise<Employee | null> {
  const { data: appUserData, error: appUserError } = await supabase
    .from('app_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (appUserError || !appUserData) return null;

  // Try by employee_id link first
  if (appUserData.employee_id) {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', appUserData.employee_id)
      .maybeSingle();
    if (data) return data;
  }

  // Fallback: try matching by email within the org
  if (appUserData.email && orgId) {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('email', appUserData.email)
      .eq('org_id', orgId)
      .eq('active', true)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

export function RecordActionModal({
  open,
  employee,
  recommendedAction,
  recommendedActionId,
  currentUser,
  currentUserId,
  onClose,
  onSuccess,
  locationId,
  className = "",
}: RecordActionModalProps) {
  const [actionDate, setActionDate] = React.useState<Date | null>(new Date());
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [locationOrgId, setLocationOrgId] = React.useState<string | null>(null);
  const [actingLeader, setActingLeader] = React.useState<Employee | null>(null);
  const [loadingLeader, setLoadingLeader] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  // When the user is an admin without an employee record, show a leader picker
  const [needsLeaderPicker, setNeedsLeaderPicker] = React.useState(false);
  const [locationLeaders, setLocationLeaders] = React.useState<Employee[]>([]);
  const supabase = createSupabaseClient();

  // Load location name and acting leader
  React.useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        // Fetch location info
        let resolvedOrgId: string | null = locationOrgId;

        if (locationId) {
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .select('name, org_id')
            .eq('id', locationId)
            .single();

          if (!locError && locData) {
            setLocationName(locData.name);
            setLocationOrgId(locData.org_id ?? null);
            resolvedOrgId = locData.org_id ?? null;
          }
        }

        resolvedOrgId = resolvedOrgId ?? employee?.org_id ?? null;

        // Determine the auth user ID to resolve
        const authId = currentUserId || (typeof currentUser === 'string' ? currentUser : null);

        if (authId) {
          setLoadingLeader(true);
          try {
            const resolved = await resolveAuthUserToEmployee(supabase, authId, resolvedOrgId);

            if (resolved) {
              setActingLeader({
                id: resolved.id,
                full_name: resolved.full_name || `${resolved.first_name || ''} ${resolved.last_name || ''}`.trim() || 'Unknown',
                role: resolved.role || 'User',
                org_id: resolved.org_id,
                location_id: resolved.location_id || locationId,
                active: resolved.active ?? true,
              } as Employee);
              setNeedsLeaderPicker(false);
            } else {
              // Admin without employee record — fetch leaders at this location for the picker
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
          } catch (err) {
            console.error('[RecordActionModal] Error resolving acting leader:', err);
            setActingLeader(null);
            setNeedsLeaderPicker(true);
          } finally {
            setLoadingLeader(false);
          }
        } else if (currentUser && typeof currentUser !== 'string') {
          // Already have an Employee object
          setActingLeader(currentUser);
          setNeedsLeaderPicker(false);
          setLoadingLeader(false);
        } else {
          setActingLeader(null);
          setNeedsLeaderPicker(false);
          setLoadingLeader(false);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [open, locationId, currentUser, currentUserId, supabase]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setActionDate(new Date());
      setNotes("");
      setActingLeader(null);
      setNeedsLeaderPicker(false);
      setLocationLeaders([]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!employee || !actingLeader?.id || !actionDate) {
      if (!actingLeader?.id) {
        alert('Please select an acting leader.');
      } else {
        alert('Missing required information. Please ensure all fields are filled.');
      }
      return;
    }

    try {
      setSaving(true);

      // Create disciplinary action record
      const { data: actionData, error: actionError } = await supabase
        .from('disc_actions')
        .insert({
          employee_id: employee.id,
          org_id: locationOrgId ?? actingLeader.org_id ?? employee.org_id ?? null,
          location_id: locationId,
          action: recommendedAction,
          action_id: recommendedActionId,
          action_date: actionDate.toISOString().split('T')[0],
          acting_leader: actingLeader.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (actionError) throw actionError;

      // Update the recommendation record (mark as action_recorded)
      const { error: updateError } = await supabase
        .from('recommended_disc_actions')
        .update({
          action_taken: 'action_recorded',
          action_taken_at: new Date().toISOString(),
          action_taken_by: actingLeader.id,
          disc_action_id: actionData?.id,
        })
        .eq('employee_id', employee.id)
        .eq('recommended_action_id', recommendedActionId)
        .eq('org_id', locationOrgId ?? employee.org_id ?? null)
        .eq('location_id', locationId)
        .is('action_taken', null);

      if (updateError) {
        console.warn('Error updating recommendation:', updateError);
      }

      if (onSuccess) {
        onSuccess(employee.id);
      }

      onClose();
    } catch (err) {
      console.error('Error recording action:', err);
      alert('Failed to record action. Please try again.');
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
            width: "500px",
            borderRadius: "16px",
            fontFamily,
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
          <Box>
            <Typography
              component="span"
              sx={{
                fontFamily,
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--ls-color-text-primary)",
              }}
            >
              Record an action for{" "}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily,
                fontSize: "20px",
                fontWeight: 600,
                color: levelsetGreen,
              }}
            >
              {employee.full_name}
            </Typography>
          </Box>
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
              onChange={(_e, newValue) => setActingLeader(newValue)}
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
                  sx: {
                    fontFamily,
                    fontSize: 14,
                  },
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

          {/* Recommended Action (disabled) */}
          <CustomTextField
            label="Action"
            value={recommendedAction}
            disabled
          />

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
              disabled={saving}
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: "none",
                color: "var(--ls-color-muted)",
                borderRadius: '8px',
                "&:hover": {
                  backgroundColor: "var(--ls-color-muted-soft)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              variant="contained"
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: "none",
                backgroundColor: levelsetGreen,
                borderRadius: '8px',
                "&:hover": {
                  backgroundColor: "var(--ls-color-brand-hover)",
                },
              }}
            >
              {saving ? "Recording..." : "Record Action"}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}
