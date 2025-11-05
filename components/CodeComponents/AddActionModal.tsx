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
  orgId: string;
  locationId: string;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

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

export function AddActionModal({
  open,
  employee,
  onClose,
  onSave,
  currentUserId,
  orgId,
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
  const [discActionsRubricOptions, setDiscActionsRubricOptions] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
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
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch location name
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single();
        
        if (!locError && locData) {
          setLocationName(locData.name);
        }

        // Fetch disc_actions_rubric options
        const { data: rubricData, error: rubricError } = await supabase
          .from('disc_actions_rubric')
          .select('*')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .order('action');
        
        if (!rubricError && rubricData) {
          setDiscActionsRubricOptions(rubricData);
        }

        // Fetch acting leader (current user)
        if (currentUserId) {
          setLoadingLeader(true);
          console.log('[AddActionModal] Fetching app_user for auth_user_id:', currentUserId);
          
          if (typeof currentUserId === 'string') {
            const { data: appUserData, error: appUserError } = await supabase
              .from('app_users')
              .select('*')
              .eq('auth_user_id', currentUserId)
              .maybeSingle();
            
            console.log('[AddActionModal] Fetched app_user data:', appUserData);
            
            if (!appUserError && appUserData) {
              const fullName = `${appUserData.first_name || ''} ${appUserData.last_name || ''}`.trim();
              const employeeLike: Employee = {
                id: appUserData.id,
                full_name: fullName || appUserData.email || 'Unknown User',
                role: appUserData.role || 'User',
                org_id: appUserData.org_id,
                location_id: appUserData.location_id || locationId,
                active: true,
              };
              setActingLeader(employeeLike);
              setActingLeaderId(appUserData.id);
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
  }, [open, orgId, locationId, currentUserId, supabase]);

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
        org_id: orgId,
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
            borderBottom: "1px solid #e9eaeb",
            backgroundColor: "#ffffff",
          }}
        >
          <Typography
            sx={{
              fontFamily,
              fontSize: "18px",
              fontWeight: 600,
              color: "#181d27",
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

          {/* Action - Dropdown from disc_actions_rubric */}
          <FormControl fullWidth size="small">
            <InputLabel
              shrink
              sx={{
                fontFamily,
                fontSize: 12,
                color: '#6b7280',
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
                  borderColor: '#e5e7eb',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: levelsetGreen,
                  borderWidth: '2px',
                },
              }}
            >
              {discActionsRubricOptions.map((item) => (
                <MenuItem key={item.id} value={item.action} sx={{ fontFamily, fontSize: 14 }}>
                  {item.action}
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
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: "none",
                color: "#6b7280",
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
                "&:hover": {
                  backgroundColor: "#254d36",
                },
                "&:disabled": {
                  backgroundColor: "#d1d5db",
                  color: "#9ca3af",
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

