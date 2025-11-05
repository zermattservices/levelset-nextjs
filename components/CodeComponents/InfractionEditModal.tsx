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
import type { Infraction, Employee } from "@/lib/supabase.types";

export interface InfractionEditModalProps {
  open: boolean;
  infraction: Infraction | null;
  onClose: () => void;
  onSave?: (infraction: Infraction) => void;
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
        fontSize: 11,
        color: '#6b7280',
        '&.Mui-focused': {
          color: levelsetGreen,
        },
      },
      '& .MuiInputBase-root': {
        fontFamily,
        fontSize: 12,
      },
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 12,
        padding: '8.5px 14px',
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
  orgId,
  locationId,
  className = "",
}: InfractionEditModalProps) {
  const [infractionDate, setInfractionDate] = React.useState<Date | null>(null);
  const [leaderId, setLeaderId] = React.useState("");
  const [acknowledgement, setAcknowledgement] = React.useState("");
  const [infractionType, setInfractionType] = React.useState("");
  const [points, setPoints] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [leaders, setLeaders] = React.useState<Employee[]>([]);
  const [saving, setSaving] = React.useState(false);
  const supabase = createSupabaseClient();

  // Load initial data
  React.useEffect(() => {
    if (!open || !infraction) {
      return;
    }

    // Set form values from infraction
    setInfractionDate(infraction.infraction_date ? new Date(infraction.infraction_date) : null);
    setLeaderId(infraction.leader_id || "");
    setAcknowledgement(infraction.acknowledgement || "");
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

    // Fetch leaders (employees with is_leader = true)
    const fetchLeaders = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .eq('is_leader', true)
          .eq('active', true)
          .order('full_name');
        
        if (!error && data) {
          setLeaders(data as Employee[]);
        }
      } catch (err) {
        console.error('Error fetching leaders:', err);
      }
    };

    fetchLocationName();
    fetchLeaders();
  }, [open, infraction, orgId, locationId, supabase]);

  const handleSave = async () => {
    if (!infraction) return;

    try {
      setSaving(true);

      const updatedInfraction: Partial<Infraction> = {
        infraction_date: infractionDate ? infractionDate.toISOString().split('T')[0] : infraction.infraction_date,
        leader_id: leaderId || infraction.leader_id,
        acknowledgement: acknowledgement || infraction.acknowledgement,
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
            sx={{
              '& .MuiInputBase-input.Mui-disabled': {
                color: '#6b7280',
                WebkitTextFillColor: '#6b7280',
              },
            }}
          />

          {/* Infraction Date */}
          <DatePicker
            label="Infraction Date"
            value={infractionDate}
            onChange={(newValue) => setInfractionDate(newValue)}
            format="M/d/yyyy"
            enableAccessibleFieldDOMStructure={false}
            slots={{
              textField: CustomTextField,
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
              },
            }}
          />

          {/* Documenting Leader */}
          <FormControl fullWidth size="small">
            <InputLabel
              sx={{
                fontFamily,
                fontSize: 11,
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
              sx={{
                fontFamily,
                fontSize: 12,
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
                <MenuItem key={leader.id} value={leader.id} sx={{ fontFamily, fontSize: 12 }}>
                  {leader.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Acknowledgement */}
          <FormControl fullWidth size="small">
            <InputLabel
              sx={{
                fontFamily,
                fontSize: 11,
                color: '#6b7280',
                '&.Mui-focused': {
                  color: levelsetGreen,
                },
              }}
            >
              Acknowledgement
            </InputLabel>
            <Select
              value={acknowledgement}
              onChange={(e) => setAcknowledgement(e.target.value)}
              label="Acknowledgement"
              sx={{
                fontFamily,
                fontSize: 12,
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
              <MenuItem value="Notified" sx={{ fontFamily, fontSize: 12 }}>Notified</MenuItem>
              <MenuItem value="Notified not present" sx={{ fontFamily, fontSize: 12 }}>Notified not present</MenuItem>
              <MenuItem value="Not notified" sx={{ fontFamily, fontSize: 12 }}>Not notified</MenuItem>
            </Select>
          </FormControl>

          {/* Infraction Type */}
          <CustomTextField
            label="Infraction"
            value={infractionType}
            onChange={(e) => setInfractionType(e.target.value)}
          />

          {/* Points */}
          <CustomTextField
            label="Points"
            type="number"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          />

          {/* Notes */}
          <CustomTextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={4}
            sx={{
              '& .MuiInputBase-input': {
                padding: '8.5px 14px',
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
              onClick={handleSave}
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}

