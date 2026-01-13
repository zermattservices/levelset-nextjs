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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Infraction, Employee } from "@/lib/supabase.types";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

export interface InfractionEditModalProps {
  open: boolean;
  infraction: Infraction | null;
  onClose: () => void;
  onSave?: (infraction: Infraction) => void;
  onDelete?: (infractionId: string) => void;
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

export function InfractionEditModal({
  open,
  infraction,
  onClose,
  onSave,
  onDelete,
  locationId,
  className = "",
}: InfractionEditModalProps) {
  const [infractionDate, setInfractionDate] = React.useState<Date | null>(null);
  const [employeeId, setEmployeeId] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState("");
  const [leaderId, setLeaderId] = React.useState("");
  const [notified, setNotified] = React.useState(true); // Boolean for toggle
  const [infractionType, setInfractionType] = React.useState("");
  const [points, setPoints] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [leaders, setLeaders] = React.useState<Employee[]>([]);
  const [discActionsRubricOptions, setDiscActionsRubricOptions] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const supabase = createSupabaseClient();

  // Load initial data
  React.useEffect(() => {
    if (!open || !infraction) {
      return;
    }

    // Set form values from infraction
    setInfractionDate(infraction.infraction_date ? new Date(infraction.infraction_date) : null);
    setEmployeeId(infraction.employee_id || "");
    setEmployeeName(infraction.employee_name || "");
    setLeaderId(infraction.leader_id || "");
    setNotified(infraction.ack_bool !== false); // Default to true if undefined
    setInfractionType(infraction.infraction || infraction.description || "");
    setPoints(infraction.points || 0);
    setNotes(infraction.notes || "");

    // Fetch location name
    const fetchLocationName = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single();
        
        if (!error && data) {
          setLocationName(data.name);
        }
      } catch (err) {
        console.error('Error fetching location:', err);
      }
    };

    // Fetch all employees for employee dropdown
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('location_id', locationId)
          .eq('active', true)
          .order('full_name');
        
        if (!error && data) {
          setEmployees(data as Employee[]);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };

    // Fetch leaders (employees with is_leader = true) + ensure the documenting leader is included
    const fetchLeaders = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('location_id', locationId)
          .eq('is_leader', true)
          .eq('active', true)
          .order('full_name');
        
        if (!error && data) {
          let leadersList = data as Employee[];
          
          // If there's a leader_id but it's not in the list, fetch and add it
          if (infraction.leader_id && !leadersList.find(l => l.id === infraction.leader_id)) {
            const { data: originalLeader } = await supabase
              .from('employees')
              .select('id, full_name')
              .eq('id', infraction.leader_id)
              .single();
            
            if (originalLeader) {
              leadersList = [...leadersList, originalLeader as Employee].sort((a, b) => 
                (a.full_name || '').localeCompare(b.full_name || '')
              );
            }
          }
          
          setLeaders(leadersList);
        }
      } catch (err) {
        console.error('Error fetching leaders:', err);
      }
    };

    // Fetch infractions_rubric options for infraction dropdown - org-level first, then location-level
    const fetchInfractionsRubric = async () => {
      try {
        // First get the org_id for this location
        const { data: locData } = await supabase
          .from('locations')
          .select('org_id')
          .eq('id', locationId)
          .single();
        
        let rubricData: any[] | null = null;
        
        // Try org-level infractions first (location_id IS NULL)
        if (locData?.org_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('infractions_rubric')
            .select('*')
            .eq('org_id', locData.org_id)
            .is('location_id', null)
            .order('points', { ascending: true });
          
          if (!orgError && orgData && orgData.length > 0) {
            rubricData = orgData;
          }
        }
        
        // Fallback to location-specific infractions
        if (!rubricData || rubricData.length === 0) {
          const { data: locData2, error: locError } = await supabase
            .from('infractions_rubric')
            .select('*')
            .eq('location_id', locationId)
            .order('points', { ascending: true });
          
          if (!locError && locData2) {
            rubricData = locData2;
          }
        }
        
        if (rubricData) {
          setDiscActionsRubricOptions(rubricData);
        }
      } catch (err) {
        console.error('Error fetching infractions_rubric:', err);
      }
    };

    fetchLocationName();
    fetchEmployees();
    fetchLeaders();
    fetchInfractionsRubric();
  }, [open, infraction, locationId, supabase]);

  // Handle infraction type change - update points automatically
  const handleInfractionTypeChange = (value: string) => {
    setInfractionType(value);
    const rubricItem = discActionsRubricOptions.find(item => item.action === value);
    if (rubricItem) {
      setPoints(rubricItem.points || 0);
    }
  };

  const handleSave = async () => {
    if (!infraction) return;

    try {
      setSaving(true);

      const updatedInfraction: Partial<Infraction> = {
        infraction_date: infractionDate ? format(infractionDate, 'yyyy-MM-dd') : infraction.infraction_date,
        leader_id: leaderId || infraction.leader_id,
        acknowledgement: notified ? 'Notified' : 'Not notified',
        ack_bool: notified,
        infraction: infractionType || infraction.infraction,
        points: points,
        notes: notes || infraction.notes,
      };

      const { error } = await supabase
        .from('infractions')
        .update(updatedInfraction)
        .eq('id', infraction.id);

      if (error) throw error;

      // Call onSave callback with updated infraction
      if (onSave) {
        onSave({ ...infraction, ...updatedInfraction } as Infraction);
      }

      onClose();
    } catch (err) {
      console.error('Error saving infraction:', err);
      alert('Failed to save infraction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!infraction) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('infractions')
        .delete()
        .eq('id', infraction.id);

      if (error) throw error;

      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(infraction.id);
      }

      setDeleteConfirmOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting infraction:', err);
      alert('Failed to delete infraction. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!infraction) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
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
          <Typography
            sx={{
              fontFamily,
              fontSize: "20px",
              fontWeight: 600,
              color: "#181d27",
            }}
          >
            Edit Infraction
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

          {/* Employee (disabled dropdown) */}
          <FormControl fullWidth size="small">
            <InputLabel
              shrink
              sx={{
                fontFamily,
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              Employee
            </InputLabel>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              label="Employee"
              notched
              disabled
              sx={{
                fontFamily,
                fontSize: 14,
                '& .MuiOutlinedInput-input': {
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
              }}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id} sx={{ fontFamily, fontSize: 14 }}>
                  {emp.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Infraction Date */}
          <DatePicker
            label="Infraction Date"
            value={infractionDate}
            onChange={(newValue) => setInfractionDate(newValue)}
            format="M/d/yyyy"
            enableAccessibleFieldDOMStructure={false}
            slots={{
              textField: CustomDateTextField,
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
              },
              popper: {
                sx: {
                  '& .MuiPaper-root': {
                    fontFamily,
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

          {/* Documenting Leader */}
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
              Documenting Leader
            </InputLabel>
            <Select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              label="Documenting Leader"
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
              {leaders.map((leader) => (
                <MenuItem key={leader.id} value={leader.id} sx={{ fontFamily, fontSize: 14 }}>
                  {leader.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Acknowledgement - Toggle Button */}
          <Box>
            <Typography
              sx={{
                fontFamily,
                fontSize: 12,
                color: '#6b7280',
                mb: 0.5,
              }}
            >
              Acknowledgement
            </Typography>
            <ToggleButtonGroup
              value={notified ? 'notified' : 'not-notified'}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setNotified(newValue === 'notified');
                }
              }}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  fontFamily,
                  fontSize: 14,
                  textTransform: 'none',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  '&.Mui-selected': {
                    backgroundColor: levelsetGreen,
                    color: '#ffffff',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#254d36',
                    },
                  },
                  '&:not(.Mui-selected)': {
                    backgroundColor: '#f3f4f6',
                    '&:hover': {
                      backgroundColor: '#e5e7eb',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="notified">Notified</ToggleButton>
              <ToggleButton value="not-notified">Not notified</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Infraction - Dropdown from disc_actions_rubric */}
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
              Infraction
            </InputLabel>
            <Select
              value={infractionType}
              onChange={(e) => handleInfractionTypeChange(e.target.value)}
              label="Infraction"
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
                  {item.points} - {item.action}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Points */}
          <CustomTextField
            label="Points"
            type="number"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          />

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="Add any additional notes..."
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
                borderRadius: '8px',
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
                  borderRadius: '8px',
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || deleting}
                variant="contained"
                sx={{
                  fontFamily,
                  fontSize: 13,
                  textTransform: "none",
                  backgroundColor: levelsetGreen,
                  borderRadius: '8px',
                  "&:hover": {
                    backgroundColor: "#254d36",
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
        title="Delete Infraction"
        message="Are you sure you want to delete this infraction? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </LocalizationProvider>
  );
}
