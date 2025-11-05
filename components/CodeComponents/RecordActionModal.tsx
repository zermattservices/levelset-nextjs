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

export function RecordActionModal({
  open,
  employee,
  recommendedAction,
  recommendedActionId,
  currentUser,
  onClose,
  onSuccess,
  orgId,
  locationId,
  className = "",
}: RecordActionModalProps) {
  const [actionDate, setActionDate] = React.useState<Date | null>(new Date());
  const [notes, setNotes] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const supabase = createSupabaseClient();

  // Load location name
  React.useEffect(() => {
    if (!open || !locationId) return;

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

    fetchLocationName();
  }, [open, locationId, supabase]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setActionDate(new Date());
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!employee || !currentUser || !actionDate) return;

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
          acting_leader: currentUser.id,
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
          action_taken_by: currentUser.id,
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
            Record an action for {employee.full_name}
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

          {/* Action Date */}
          <DatePicker
            label="Action Date"
            value={actionDate}
            onChange={(newValue) => setActionDate(newValue)}
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

          {/* Acting Leader (disabled) */}
          <CustomTextField
            label="Acting Leader"
            value={currentUser?.full_name || ""}
            disabled
            sx={{
              '& .MuiInputBase-input.Mui-disabled': {
                color: '#6b7280',
                WebkitTextFillColor: '#6b7280',
              },
            }}
          />

          {/* Recommended Action (disabled) */}
          <CustomTextField
            label="Action"
            value={recommendedAction}
            disabled
            sx={{
              '& .MuiInputBase-input.Mui-disabled': {
                color: '#6b7280',
                WebkitTextFillColor: '#6b7280',
              },
            }}
          />

          {/* Notes */}
          <CustomTextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="Add any additional notes..."
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

