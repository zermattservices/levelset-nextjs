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
  orgId: string;
  locationId: string;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

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
        color: '#6b7280',
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
        color: '#9ca3af',
        WebkitTextFillColor: '#9ca3af',
        backgroundColor: '#f9fafb',
      },
      '& .MuiOutlinedInput-root.Mui-disabled': {
        backgroundColor: '#f9fafb',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#e5e7eb',
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#e5e7eb',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#d1d5db',
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
        borderColor: '#e5e7eb',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#d1d5db',
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

export function RecordActionModal({
  open,
  employee,
  recommendedAction,
  recommendedActionId,
  currentUser,
  currentUserId,
  onClose,
  onSuccess,
  orgId,
  locationId,
  className = "",
}: RecordActionModalProps) {
  const [actionDate, setActionDate] = React.useState<Date | null>(new Date());
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [actingLeader, setActingLeader] = React.useState<Employee | null>(null);
  const [loadingLeader, setLoadingLeader] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const supabase = createSupabaseClient();

  // Load location name and acting leader
  React.useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        // Fetch location name
        if (locationId) {
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
          
          if (!locError && locData) {
            setLocationName(locData.name);
          }
        }

        // Fetch acting leader - look up app_users by auth_user_id
        if (!currentUser && currentUserId) {
          setLoadingLeader(true);
          console.log('[RecordActionModal] Fetching app_user for auth_user_id:', currentUserId);
          try {
            
            // currentUserId is the auth user ID, look it up in app_users
            const { data: appUserData, error: appUserError } = await supabase
              .from('app_users')
              .select('*')
              .eq('auth_user_id', currentUserId)
              .maybeSingle();
            
            console.log('[RecordActionModal] App user data:', appUserData);
            console.log('[RecordActionModal] App user error:', appUserError);
            
            if (!appUserError && appUserData) {
              // Convert app_user to Employee-like object for display
              const fullName = `${appUserData.first_name || ''} ${appUserData.last_name || ''}`.trim();
              const employeeLike: Employee = {
                id: appUserData.id,
                full_name: fullName || appUserData.email || 'Unknown User',
                role: appUserData.role || 'User',
                org_id: appUserData.org_id,
                location_id: appUserData.location_id || locationId,
                active: true,
              };
              console.log('[RecordActionModal] Setting acting leader:', employeeLike);
              setActingLeader(employeeLike);
            } else {
              console.warn('[RecordActionModal] No app_user found for auth_user_id:', currentUserId);
              setActingLeader({
                id: currentUserId,
                full_name: 'Current User',
                role: 'User',
                org_id: orgId,
                location_id: locationId,
                active: true,
              });
            }
          } catch (err) {
            console.error('[RecordActionModal] Error fetching app_user:', err);
            setActingLeader({
              id: currentUserId,
              full_name: 'Current User',
              role: 'User',
              org_id: orgId,
              location_id: locationId,
              active: true,
            });
          } finally {
            setLoadingLeader(false);
          }
        } else if (currentUser) {
          console.log('[RecordActionModal] Using currentUser:', currentUser);
          setActingLeader(currentUser);
          setLoadingLeader(false);
        } else {
          console.log('[RecordActionModal] No currentUser or currentUserId provided');
          setActingLeader(null);
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
    }
  }, [open]);

  const handleSubmit = async () => {
    const leader = actingLeader || currentUser;
    if (!employee || !leader || !actionDate) {
      alert('Missing required information. Please ensure you are logged in.');
      return;
    }

    try {
      setSaving(true);

      // Create disciplinary action record
      const { data: actionData, error: actionError } = await supabase
        .from('disc_actions')
        .insert({
          employee_id: employee.id,
          org_id: orgId,
          location_id: locationId,
          action: recommendedAction,
          action_id: recommendedActionId,
          action_date: actionDate.toISOString().split('T')[0],
          acting_leader: leader.id,
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
          action_taken_by: leader.id,
          disc_action_id: actionData?.id,
        })
        .eq('employee_id', employee.id)
        .eq('recommended_action_id', recommendedActionId)
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .is('action_taken', null);

      if (updateError) {
        console.warn('Error updating recommendation:', updateError);
      }

      // Call success callback to open employee modal
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
            borderBottom: "1px solid #e9eaeb",
            backgroundColor: "#ffffff",
          }}
        >
          <Box>
            <Typography
              component="span"
              sx={{
                fontFamily,
                fontSize: "20px",
                fontWeight: 600,
                color: "#181d27",
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
              color: "#6b7280",
              "&:hover": {
                backgroundColor: "#f3f4f6",
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

          {/* Acting Leader (disabled) */}
          <CustomTextField
            label="Acting Leader"
            value={loadingLeader ? "Loading..." : (actingLeader?.full_name || "Not available")}
            disabled
          />

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
                      color: '#fff !important',
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
                      color: '#fff !important',
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
                color: '#6b7280',
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
                borderColor: '#e5e7eb',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#d1d5db',
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
                color: "#6b7280",
                "&:hover": {
                  backgroundColor: "#f3f4f6",
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
                "&:hover": {
                  backgroundColor: "#264d38",
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

