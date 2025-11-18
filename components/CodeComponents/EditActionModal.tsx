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
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

export interface EditActionModalProps {
  open: boolean;
  action: DisciplinaryAction | null;
  onClose: () => void;
  onSave?: (action: DisciplinaryAction) => void;
  onDelete?: (actionId: string) => void;
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

export function EditActionModal({
  open,
  action,
  onClose,
  onSave,
  onDelete,
  locationId,
  className = "",
}: EditActionModalProps) {
  const [actionDate, setActionDate] = React.useState<Date | null>(null);
  const [actingLeaderId, setActingLeaderId] = React.useState("");
  const [actingLeaderName, setActingLeaderName] = React.useState("");
  const [actionType, setActionType] = React.useState("");
  const [actionId, setActionId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState("");
  const [locationOrgId, setLocationOrgId] = React.useState<string | null>(null);
  const [discActionsRubricOptions, setDiscActionsRubricOptions] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const supabase = createSupabaseClient();

  // Load initial data
  React.useEffect(() => {
    if (!open || !action) {
      return;
    }

    // Set form values from action
    setActionDate(action.action_date ? new Date(action.action_date) : null);
    setActingLeaderId(action.acting_leader || "");
    setActingLeaderName(action.leader_name || "");
    setActionType(action.action || "");
    setActionId(action.action_id || "");
    setNotes(action.notes || "");
    setEmployeeName(action.employee_name || "");

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

        // Fetch disc_actions_rubric options
        const { data: rubricData, error: rubricError } = await supabase
          .from('disc_actions_rubric')
          .select('*')
          .eq('location_id', locationId)
          .order('points_threshold', { ascending: true }); // Order by points, lowest to highest
        
        if (!rubricError && rubricData) {
          setDiscActionsRubricOptions(rubricData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [open, action, locationId, supabase]);

  // Handle action type change
  const handleActionTypeChange = (value: string) => {
    setActionType(value);
    const rubricItem = discActionsRubricOptions.find(item => item.action === value);
    if (rubricItem) {
      setActionId(rubricItem.id);
    }
  };

  const handleSave = async () => {
    if (!action) return;

    try {
      setSaving(true);

      const updatedAction: Partial<DisciplinaryAction> = {
        action_date: actionDate ? actionDate.toISOString().split('T')[0] : action.action_date,
        action: actionType || action.action,
        action_id: actionId || action.action_id,
        notes: notes || action.notes,
      };

      const { error } = await supabase
        .from('disc_actions')
        .update(updatedAction)
        .eq('id', action.id);

      if (error) throw error;

      // Call onSave callback with updated action
      if (onSave) {
        onSave({ ...action, ...updatedAction } as DisciplinaryAction);
      }

      onClose();
    } catch (err) {
      console.error('Error saving disciplinary action:', err);
      alert('Failed to save disciplinary action. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!action) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('disc_actions')
        .delete()
        .eq('id', action.id);

      if (error) throw error;

      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(action.id);
      }

      setDeleteConfirmOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting disciplinary action:', err);
      alert('Failed to delete disciplinary action. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!action) return null;

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
            Edit Disciplinary Action
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

          {/* Employee (disabled) */}
          <CustomTextField
            label="Employee"
            value={employeeName}
            disabled
          />

          {/* Acting Leader (disabled) */}
          <CustomTextField
            label="Acting Leader"
            value={actingLeaderName}
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
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 1 }}>
            <Button
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={saving || deleting}
              sx={{
                fontFamily,
                fontSize: 13,
                textTransform: "none",
                color: "#dc2626",
                borderColor: "#dc2626",
                border: "1px solid",
                padding: "6px 16px",
                "&:hover": {
                  backgroundColor: "#fee2e2",
                  borderColor: "#b91c1c",
                },
                "&:disabled": {
                  borderColor: "#d1d5db",
                  color: "#9ca3af",
                },
              }}
            >
              Delete
            </Button>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                onClick={onClose}
                disabled={saving || deleting}
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
                disabled={saving || deleting || !actionType}
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
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      <DeleteConfirmationModal
        open={deleteConfirmOpen}
        title="Delete Disciplinary Action"
        message="Are you sure you want to delete this disciplinary action? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </LocalizationProvider>
  );
}

