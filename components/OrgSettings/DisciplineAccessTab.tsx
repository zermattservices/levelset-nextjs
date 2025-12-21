import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import sty from './DisciplineAccessTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

const fontFamily = '"Satoshi", sans-serif';

const BrandCheckbox = styled(Checkbox)(() => ({
  color: "#9ca3af",
  padding: 8,
  "&.Mui-checked": {
    color: "#31664a",
  },
  "&:hover": {
    backgroundColor: "rgba(49, 102, 74, 0.08)",
  },
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: '#31664a',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a',
    },
  },
}));

interface Role {
  role_name: string;
  hierarchy_level: number;
  can_submit: boolean;
}

interface DisciplineAccessTabProps {
  orgId: string | null;
  locationId: string | null;
}

export function DisciplineAccessTab({ orgId, locationId }: DisciplineAccessTabProps) {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Password state
  const [password, setPassword] = React.useState<string>('');
  const [originalPassword, setOriginalPassword] = React.useState<string>('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(true);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingPassword, setPendingPassword] = React.useState<string>('');

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { selectedLocationId } = useLocationContext();
  
  const effectiveLocationId = locationId || selectedLocationId;

  // Fetch roles and their discipline access settings
  React.useEffect(() => {
    async function fetchRolesAndAccess() {
      if (!orgId || !effectiveLocationId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch roles from location_role_hierarchy
        const { data: rolesData, error: rolesError } = await supabase
          .from('location_role_hierarchy')
          .select('role_name, hierarchy_level')
          .eq('location_id', effectiveLocationId)
          .order('hierarchy_level', { ascending: true });

        if (rolesError) throw rolesError;

        // Fetch existing discipline access settings
        const { data: accessData, error: accessError } = await supabase
          .from('discipline_role_access')
          .select('role_name, can_submit')
          .eq('org_id', orgId);

        if (accessError) throw accessError;

        // Create a map of role access
        const accessMap = new Map<string, boolean>();
        (accessData || []).forEach(a => accessMap.set(a.role_name, a.can_submit));

        // Combine roles with their access settings
        const combinedRoles: Role[] = (rolesData || []).map(r => ({
          role_name: r.role_name,
          hierarchy_level: r.hierarchy_level,
          can_submit: accessMap.get(r.role_name) ?? false,
        }));

        setRoles(combinedRoles);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError('Failed to load roles');
      } finally {
        setLoading(false);
      }
    }

    fetchRolesAndAccess();
  }, [orgId, effectiveLocationId, supabase]);

  // Fetch password
  React.useEffect(() => {
    async function fetchPassword() {
      if (!effectiveLocationId) {
        setPasswordLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('discipline_password')
          .eq('id', effectiveLocationId)
          .single();

        if (fetchError) throw fetchError;

        setPassword(data?.discipline_password || '');
        setOriginalPassword(data?.discipline_password || '');
      } catch (err) {
        console.error('Error fetching password:', err);
      } finally {
        setPasswordLoading(false);
      }
    }

    fetchPassword();
  }, [effectiveLocationId, supabase]);

  const handleRoleToggle = async (roleName: string, checked: boolean) => {
    if (!orgId) return;

    // Optimistic update
    setRoles(prev => prev.map(r => 
      r.role_name === roleName ? { ...r, can_submit: checked } : r
    ));

    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from('discipline_role_access')
        .select('id')
        .eq('org_id', orgId)
        .eq('role_name', roleName)
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase
          .from('discipline_role_access')
          .update({ can_submit: checked, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase
          .from('discipline_role_access')
          .insert({ org_id: orgId, role_name: roleName, can_submit: checked });
      }
    } catch (err) {
      console.error('Error updating role access:', err);
      // Revert on error
      setRoles(prev => prev.map(r => 
        r.role_name === roleName ? { ...r, can_submit: !checked } : r
      ));
      setError('Failed to update role access');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSavePassword = () => {
    if (password !== originalPassword) {
      setPendingPassword(password);
      setShowConfirmModal(true);
    }
  };

  const confirmPasswordChange = async () => {
    if (!effectiveLocationId) return;

    try {
      const { error: updateError } = await supabase
        .from('locations')
        .update({ discipline_password: pendingPassword })
        .eq('id', effectiveLocationId);

      if (updateError) throw updateError;

      setOriginalPassword(pendingPassword);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
    }
  };

  const cancelPasswordChange = () => {
    setShowConfirmModal(false);
    setPassword(originalPassword);
  };

  const hasPasswordChanges = password !== originalPassword;

  if (loading || passwordLoading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Discipline Form Access</h3>
        <p className={sty.introDescription}>
          Configure which roles can submit discipline forms in the mobile app and set the access password.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      {/* Role Permissions Section */}
      <div className={sty.section}>
        <h4 className={sty.sectionTitle}>Role Permissions</h4>
        <p className={sty.sectionDescription}>
          Select which roles are allowed to submit discipline forms. Changes are saved automatically.
        </p>

        <div className={sty.rolesList}>
          {roles.length === 0 ? (
            <div className={sty.emptyState}>
              No roles found. Please set up a role hierarchy for this location first.
            </div>
          ) : (
            roles.map((role) => (
              <div key={role.role_name} className={sty.roleRow}>
                <BrandCheckbox
                  checked={role.can_submit}
                  onChange={(e) => handleRoleToggle(role.role_name, e.target.checked)}
                />
                <span className={sty.roleName}>{role.role_name}</span>
                <span className={sty.roleLevel}>Level {role.hierarchy_level}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className={sty.section}>
        <h4 className={sty.sectionTitle}>Form Password</h4>
        <p className={sty.sectionDescription}>
          This password is required to access the discipline form in the mobile app. 
          Leaders must enter this password before they can submit a discipline form.
        </p>

        <div className={sty.passwordRow}>
          <StyledTextField
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter password"
            size="small"
            sx={{ width: 280 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
          {hasPasswordChanges && (
            <Button
              variant="contained"
              onClick={handleSavePassword}
              sx={{
                fontFamily,
                textTransform: 'none',
                backgroundColor: '#31664a',
                '&:hover': {
                  backgroundColor: '#264d38',
                },
              }}
            >
              Save Password
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onClose={cancelPasswordChange}>
        <DialogTitle sx={{ fontFamily }}>Confirm Password Change</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily }}>
            Are you sure you want to change the discipline form password? 
            All leaders will need to use the new password to access the discipline form.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelPasswordChange} sx={{ fontFamily, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={confirmPasswordChange} 
            variant="contained"
            sx={{
              fontFamily,
              textTransform: 'none',
              backgroundColor: '#31664a',
              '&:hover': {
                backgroundColor: '#264d38',
              },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default DisciplineAccessTab;
