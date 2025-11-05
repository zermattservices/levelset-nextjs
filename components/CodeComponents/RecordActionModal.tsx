"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createSupabaseClient } from "@/util/supabase/component";
import type { RecommendedAction } from "@/lib/supabase.types";
import type { Employee } from "@/lib/supabase.types";

export interface RecordActionModalProps {
  open: boolean;
  onClose: (success?: boolean) => void;
  recommendation: RecommendedAction;
  orgId: string;
  locationId: string;
}

export function RecordActionModal({
  open,
  onClose,
  recommendation,
  orgId,
  locationId,
}: RecordActionModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [actionId, setActionId] = React.useState<string>(recommendation.action_id);
  const [actingLeaderId, setActingLeaderId] = React.useState<string>("");
  const [actionDate, setActionDate] = React.useState<Date>(new Date());
  const [notes, setNotes] = React.useState<string>("");

  // Data
  const [availableActions, setAvailableActions] = React.useState<Array<{ id: string; action: string; points_threshold: number }>>([]);
  const [availableLeaders, setAvailableLeaders] = React.useState<Employee[]>([]);
  const [locationName, setLocationName] = React.useState<string>("");

  const supabase = createSupabaseClient();

  // Fetch form data
  React.useEffect(() => {
    if (!open) return;

    const fetchFormData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch available actions
        const { data: actionsData, error: actionsError } = await supabase
          .from('disc_actions_rubric')
          .select('id, action, points_threshold')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .order('points_threshold', { ascending: true });

        if (actionsError) throw actionsError;
        setAvailableActions(actionsData || []);

        // Fetch available leaders
        const { data: leadersData, error: leadersError } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .eq('active', true)
          .eq('is_leader', true)
          .order('full_name', { ascending: true });

        if (leadersError) throw leadersError;
        setAvailableLeaders(leadersData || []);

        // Try to fetch location name (locations table may not exist)
        try {
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();

          if (!locationError && locationData) {
            setLocationName(locationData.name || 'Unknown Location');
          } else {
            setLocationName('Location'); // Fallback if table doesn't exist
          }
        } catch {
          setLocationName('Location'); // Fallback if table doesn't exist
        }

        // Set default action to the recommended one
        setActionId(recommendation.action_id);

      } catch (err) {
        console.error('Error fetching form data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [open, orgId, locationId, recommendation.action_id, supabase]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setActionId(recommendation.action_id);
      setActingLeaderId("");
      setActionDate(new Date());
      setNotes("");
      setError(null);
    }
  }, [open, recommendation.action_id]);

  // Handle save
  const handleSave = async () => {
    if (!actingLeaderId) {
      setError("Please select an acting leader");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Get current user's employee_id for action_taken_by
      const { data: { user } } = await supabase.auth.getUser();
      let actionTakenBy: string | undefined;
      
      if (user?.email) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user.email)
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .single();
        
        if (employee) {
          actionTakenBy = employee.id;
        }
      }

      // Get action name for the disc_actions record
      const selectedAction = availableActions.find(a => a.id === actionId);
      const actionName = selectedAction?.action || 'Unknown Action';

      // Create the disciplinary action record
      const { data: actionRecord, error: actionError } = await supabase
        .from('disc_actions')
        .insert({
          employee_id: recommendation.employee_id,
          org_id: orgId,
          location_id: locationId,
          action_id: actionId,
          action: actionName,
          action_date: actionDate.toISOString().split('T')[0],
          acting_leader: actingLeaderId,
          notes: notes || null,
        })
        .select()
        .single();

      if (actionError) throw actionError;

      // Update the recommended_action record
      const { error: updateError } = await supabase
        .from('recommended_actions')
        .update({
          action_taken_id: actionRecord.id,
          action_taken_at: new Date().toISOString(),
          action_taken_by: actionTakenBy || null,
        })
        .eq('id', recommendation.id);

      if (updateError) throw updateError;

      onClose(true);
    } catch (err) {
      console.error('Error recording action:', err);
      setError(err instanceof Error ? err.message : 'Failed to record action. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          fontFamily: 'Satoshi',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'Satoshi',
          fontSize: '20px',
          fontWeight: 600,
          color: '#414651',
          padding: '24px 24px 16px',
        }}
      >
        Record Disciplinary Action
      </DialogTitle>

      <DialogContent sx={{ padding: '0 24px' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {error && (
              <Box
                sx={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Satoshi',
                    fontSize: '14px',
                    color: '#dc2626',
                  }}
                >
                  {error}
                </Typography>
              </Box>
            )}

            {/* Disciplinary Action Dropdown */}
            <FormControl fullWidth>
              <InputLabel sx={{ fontFamily: 'Satoshi' }}>Disciplinary Action</InputLabel>
              <Select
                value={actionId}
                onChange={(e) => setActionId(e.target.value)}
                label="Disciplinary Action"
                sx={{ fontFamily: 'Satoshi' }}
              >
                {availableActions.map((action) => (
                  <MenuItem key={action.id} value={action.id} sx={{ fontFamily: 'Satoshi' }}>
                    {action.action} ({action.points_threshold} points)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Acting Leader Dropdown */}
            <FormControl fullWidth required>
              <InputLabel sx={{ fontFamily: 'Satoshi' }}>Acting Leader</InputLabel>
              <Select
                value={actingLeaderId}
                onChange={(e) => setActingLeaderId(e.target.value)}
                label="Acting Leader"
                sx={{ fontFamily: 'Satoshi' }}
              >
                {availableLeaders.map((leader) => (
                  <MenuItem key={leader.id} value={leader.id} sx={{ fontFamily: 'Satoshi' }}>
                    {leader.full_name || 'Unknown'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Employee (disabled) */}
            <TextField
              label="Employee"
              value={recommendation.employee_name || 'Unknown'}
              disabled
              fullWidth
              sx={{
                fontFamily: 'Satoshi',
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#535862',
                },
              }}
            />

            {/* Action Date */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Action Date"
                value={actionDate}
                onChange={(newValue) => newValue && setActionDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: { fontFamily: 'Satoshi' },
                  },
                }}
              />
            </LocalizationProvider>

            {/* Location (disabled) */}
            <TextField
              label="Location"
              value={locationName}
              disabled
              fullWidth
              sx={{
                fontFamily: 'Satoshi',
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#535862',
                },
              }}
            />

            {/* Notes */}
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Add any additional notes about this disciplinary action..."
              sx={{ fontFamily: 'Satoshi' }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px 24px 24px', gap: 1 }}>
        <Button
          onClick={() => onClose()}
          disabled={saving}
          sx={{
            fontFamily: 'Satoshi',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            color: '#535862',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || loading || !actingLeaderId}
          variant="contained"
          sx={{
            fontFamily: 'Satoshi',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            backgroundColor: '#31664a',
            '&:hover': {
              backgroundColor: '#28523e',
            },
            '&:disabled': {
              backgroundColor: '#d1d5db',
            },
          }}
        >
          {saving ? 'Saving...' : 'Record Action'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
