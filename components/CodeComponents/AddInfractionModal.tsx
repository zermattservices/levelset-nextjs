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
import { createSupabaseClient } from "@/util/supabase/component";
import type { Infraction, Employee } from "@/lib/supabase.types";

export interface AddInfractionModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSave?: (infraction: Infraction) => void;
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

export function AddInfractionModal({
  open,
  employee,
  onClose,
  onSave,
  currentUserId,
  orgId,
  locationId,
  className = "",
}: AddInfractionModalProps) {
  const [infractionDate, setInfractionDate] = React.useState<Date | null>(new Date());
  const [leaderId, setLeaderId] = React.useState("");
  const [actingLeader, setActingLeader] = React.useState<Employee | null>(null);
  const [loadingLeader, setLoadingLeader] = React.useState(false);
  const [notified, setNotified] = React.useState(false); // Default to Not notified
  const [infractionType, setInfractionType] = React.useState("");
  const [points, setPoints] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [leaders, setLeaders] = React.useState<Employee[]>([]);
  const [infractionsRubricOptions, setInfractionsRubricOptions] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const supabase = createSupabaseClient();

  // Load initial data
  React.useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setInfractionDate(new Date());
      setLeaderId("");
      setActingLeader(null);
      setNotified(false);
      setInfractionType("");
      setPoints(0);
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

        // Fetch all employees for employee dropdown
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .eq('active', true)
          .order('full_name');
        
        if (!empError && empData) {
          setEmployees(empData as Employee[]);
        }

        // Fetch leaders for documenting leader dropdown
        const { data: leadersData, error: leadersError } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .eq('is_leader', true)
          .eq('active', true)
          .order('full_name');
        
        if (!leadersError && leadersData) {
          setLeaders(leadersData as Employee[]);
        }

        // Fetch infractions_rubric options
        const { data: rubricData, error: rubricError } = await supabase
          .from('infractions_rubric')
          .select('*')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .order('action');
        
        if (!rubricError && rubricData) {
          setInfractionsRubricOptions(rubricData);
        }

        // Fetch acting leader (current user)
        if (currentUserId) {
          setLoadingLeader(true);
          console.log('[AddInfractionModal] Fetching app_user for auth_user_id:', currentUserId);
          
          if (typeof currentUserId === 'string') {
            const { data: appUserData, error: appUserError } = await supabase
              .from('app_users')
              .select('*')
              .eq('auth_user_id', currentUserId)
              .maybeSingle();
            
            console.log('[AddInfractionModal] Fetched app_user data:', appUserData);
            
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
              setLeaderId(appUserData.id); // Set as default leader
            }
          }
          setLoadingLeader(false);
        }
      } catch (err) {
        console.error('[AddInfractionModal] Error fetching data:', err);
        setLoadingLeader(false);
      }
    };

    fetchData();
  }, [open, orgId, locationId, currentUserId, supabase]);

  // Handle infraction type change - update points automatically
  const handleInfractionTypeChange = (value: string) => {
    setInfractionType(value);
    const rubricItem = infractionsRubricOptions.find(item => item.action === value);
    if (rubricItem) {
      setPoints(rubricItem.points || 0);
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setSaving(true);

      const newInfraction: Partial<Infraction> = {
        employee_id: employee.id,
        infraction_date: infractionDate ? infractionDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        leader_id: leaderId,
        acknowledgement: notified ? 'Notified' : 'Not notified',
        ack_bool: notified,
        infraction: infractionType,
        points: points,
        notes: notes,
        org_id: orgId,
        location_id: locationId,
      };

      const { data, error } = await supabase
        .from('infractions')
        .insert(newInfraction)
        .select()
        .single();

      if (error) throw error;

      // Call onSave callback with new infraction
      if (onSave && data) {
        onSave(data as Infraction);
      }

      onClose();
    } catch (err) {
      console.error('Error saving infraction:', err);
      alert('Failed to save infraction. Please try again.');
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
              fontSize: "18px",
              fontWeight: 600,
              color: "#181d27",
            }}
          >
            Record an infraction for{" "}
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

          {/* Employee (enabled dropdown) */}
          <CustomTextField
            label="Employee"
            value={employee.full_name}
            disabled
          />

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

          {/* Infraction - Dropdown from infractions_rubric */}
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
              {infractionsRubricOptions.map((item) => (
                <MenuItem key={item.id} value={item.action} sx={{ fontFamily, fontSize: 14 }}>
                  {item.action}
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
            placeholder="Please include any information that's relevant to this infraction..."
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
              disabled={saving || !infractionType || !leaderId}
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
              {saving ? "Saving..." : "Record Infraction"}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}

