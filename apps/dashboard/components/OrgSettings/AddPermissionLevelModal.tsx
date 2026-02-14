/**
 * Add Permission Level Modal
 * Modal for creating custom permission levels
 */

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import { createSupabaseClient } from '@/util/supabase/component';
import { getDefaultPermissionsArray, getDefaultProfileName } from '@/lib/permissions/defaults';
import { getSubItemKey, getModuleKey, P } from '@/lib/permissions/constants';

const fontFamily = '"Satoshi", sans-serif';

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
  },
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 14,
    '&.Mui-focused': {
      color: 'var(--ls-color-brand)',
    },
  },
}));

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
}));

interface OrgRole {
  role_name: string;
  hierarchy_level: number;
}

interface AddPermissionLevelModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  orgId: string | null;
  existingLevels: number[];
  orgRoles?: OrgRole[];
  initialTier?: number;
}

export function AddPermissionLevelModal({
  open,
  onClose,
  onCreated,
  orgId,
  existingLevels,
  orgRoles = [],
  initialTier,
}: AddPermissionLevelModalProps) {
  const [name, setName] = React.useState('');
  const [baseLevel, setBaseLevel] = React.useState<number>(initialTier ?? 1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Get role name for a tier level
  const getRoleNameForTier = React.useCallback((tier: number): string => {
    const role = orgRoles.find(r => r.hierarchy_level === tier);
    return role?.role_name || getDefaultProfileName(tier);
  }, [orgRoles]);

  // Available base tiers (1, 2, 3) with actual role names
  const availableTiers = React.useMemo(() => [
    { value: 1, label: `Tier 1 - ${getRoleNameForTier(1)}` },
    { value: 2, label: `Tier 2 - ${getRoleNameForTier(2)}` },
    { value: 3, label: `Tier 3 - ${getRoleNameForTier(3)}` },
  ], [getRoleNameForTier]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setBaseLevel(initialTier ?? 1);
      setError(null);
    }
  }, [open, initialTier]);

  const handleSubmit = async () => {
    if (!orgId || !name.trim()) {
      setError('Please enter a name for the permission level');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create the permission profile
      const { data: profile, error: profileError } = await supabase
        .from('permission_profiles')
        .insert({
          org_id: orgId,
          name: name.trim(),
          hierarchy_level: baseLevel,
          linked_role_name: null, // Custom profiles are not linked to roles
          is_system_default: false,
        })
        .select('id')
        .single();

      if (profileError) throw profileError;

      // Get all sub-items with their module keys
      const { data: subItems, error: subItemsError } = await supabase
        .from('permission_sub_items')
        .select(`
          id,
          key,
          permission_modules!inner (
            key
          )
        `);

      if (subItemsError) throw subItemsError;

      // Get default permissions for the base level
      const defaultPermissions = new Set(getDefaultPermissionsArray(baseLevel));

      // Create access records for all sub-items
      const accessRecords = (subItems as any[]).map((item) => {
        const fullKey = `${item.permission_modules.key}.${item.key}`;
        return {
          profile_id: profile.id,
          sub_item_id: item.id,
          is_enabled: defaultPermissions.has(fullKey as any),
        };
      });

      const { error: accessError } = await supabase
        .from('permission_profile_access')
        .insert(accessRecords);

      if (accessError) throw accessError;

      onCreated();
    } catch (err: any) {
      console.error('Error creating permission level:', err);
      setError(err.message || 'Failed to create permission level');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily,
          fontSize: 18,
          fontWeight: 600,
          borderBottom: '1px solid var(--ls-color-muted-border)',
          pb: 2,
        }}
      >
        Add Custom Permission Level
      </DialogTitle>

      <DialogContent sx={{ pt: 3, mt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StyledTextField
            label="Permission Level Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Senior Manager"
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel
              sx={{
                fontFamily,
                fontSize: 14,
                backgroundColor: 'var(--ls-color-bg-container)',
                px: 0.5,
                '&.Mui-focused': {
                  color: 'var(--ls-color-brand)',
                },
              }}
            >
              Permission Tier
            </InputLabel>
            <StyledSelect
              value={baseLevel}
              onChange={(e) => setBaseLevel(e.target.value as number)}
              label="Permission Tier"
            >
              {availableTiers.map((tier) => (
                <MenuItem
                  key={tier.value}
                  value={tier.value}
                  sx={{ fontFamily, fontSize: 14 }}
                >
                  {tier.label}
                </MenuItem>
              ))}
            </StyledSelect>
          </FormControl>

          <p
            style={{
              fontFamily,
              fontSize: 13,
              color: 'var(--ls-color-muted)',
              margin: 0,
            }}
          >
            The permissions will be copied from the selected tier. You can customize
            them after creating the permission level.
          </p>
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--ls-color-muted-border)' }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{
            fontFamily,
            fontSize: 14,
            textTransform: 'none',
            color: 'var(--ls-color-muted)',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          variant="contained"
          sx={{
            fontFamily,
            fontSize: 14,
            textTransform: 'none',
            backgroundColor: 'var(--ls-color-brand)',
            '&:hover': {
              backgroundColor: '#285540',
            },
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddPermissionLevelModal;
