import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import CircularProgress from '@mui/material/CircularProgress';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

interface LocationInfo {
  id: string;
  location_number: string;
  name: string;
}

interface EditLocationAccessModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string | null;
  userName: string;
  currentLocationAccess: string[];
  orgLocations: LocationInfo[];
  disabled?: boolean;
}

export function EditLocationAccessModal({
  open,
  onClose,
  onSaved,
  userId,
  userName,
  currentLocationAccess,
  orgLocations,
  disabled = false,
}: EditLocationAccessModalProps) {
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Initialize selected locations when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedLocationIds(new Set(currentLocationAccess));
      setError(null);
    }
  }, [open, currentLocationAccess]);

  // Handle location checkbox toggle
  const handleLocationToggle = (locationId: string) => {
    if (disabled) return;
    
    setSelectedLocationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!userId || disabled) return;

    // At least one location must be selected
    if (selectedLocationIds.size === 0) {
      setError('Please select at least one location');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Delete all existing location access for this user
      const { error: deleteError } = await supabase
        .from('user_location_access')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new location access records
      const locationAccessRecords = Array.from(selectedLocationIds).map(locId => ({
        user_id: userId,
        location_id: locId,
      }));

      const { error: insertError } = await supabase
        .from('user_location_access')
        .insert(locationAccessRecords);

      if (insertError) throw insertError;

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error updating location access:', err);
      setError('Failed to update location access');
    } finally {
      setSaving(false);
    }
  };

  // Check if there are changes
  const hasChanges = React.useMemo(() => {
    if (selectedLocationIds.size !== currentLocationAccess.length) return true;
    for (const locId of currentLocationAccess) {
      if (!selectedLocationIds.has(locId)) return true;
    }
    return false;
  }, [selectedLocationIds, currentLocationAccess]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        }
      }}
    >
      <DialogTitle sx={{ fontFamily, fontWeight: 600 }}>
        Edit Location Access
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280' }}>
            Configure which locations <strong>{userName}</strong> can access.
          </Typography>

          {error && (
            <Typography sx={{ color: '#dc2626', fontSize: 14, fontFamily }}>
              {error}
            </Typography>
          )}

          <FormGroup sx={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: 2, 
            p: 2,
            border: '1px solid #e5e7eb',
          }}>
            {orgLocations.map(loc => (
              <FormControlLabel
                key={loc.id}
                control={
                  <Checkbox
                    checked={selectedLocationIds.has(loc.id)}
                    onChange={() => handleLocationToggle(loc.id)}
                    disabled={disabled}
                    sx={{
                      color: '#31664a' /* TODO: Use design token */,
                      '&.Mui-checked': { color: '#31664a' /* TODO: Use design token */ },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontFamily, fontSize: 14 }}>
                    {loc.name} ({loc.location_number})
                  </Typography>
                }
              />
            ))}
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            fontFamily,
            textTransform: 'none',
            color: '#6b7280',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges || saving || disabled}
          sx={{
            fontFamily,
            textTransform: 'none',
            backgroundColor: '#31664a' /* TODO: Use design token */,
            '&:hover': {
              backgroundColor: '#264d38',
            },
            '&.Mui-disabled': {
              backgroundColor: '#e5e7eb',
            },
          }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditLocationAccessModal;
